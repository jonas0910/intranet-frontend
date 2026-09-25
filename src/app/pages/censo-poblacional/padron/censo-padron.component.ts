import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CensoPoblacionalService, Ciudadano, Sector, Organizacion } from '../services/censo-poblacional.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import * as XLSX from 'xlsx';

declare var $: any;

@Component({
  selector: 'app-censo-padron',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, SystemLayoutComponent, RouterModule, ConfirmDialogComponent],
  templateUrl: './censo-padron.component.html',
  styles: [`
    #padronTable thead th { font-weight: 600; border-bottom: 2px solid #dee2e6; vertical-align: middle; }
    #padronTable tbody td { vertical-align: middle; }
    .btn-group-sm .btn { padding: 0.25rem 0.5rem; }
  `]
})
export class CensoPadronComponent implements OnInit {
  cv!: CrudViewConfig;

  ciudadanos: Ciudadano[] = [];
  ciudadanosFiltrados: Ciudadano[] = [];
  sectores: Sector[] = [];
  organizaciones: Organizacion[] = [];

  isEditing = false;
  saving = false;
  deleting = false;
  loading = false;
  isFiltersCollapsed = false;

  // Filtros
  filtroSearch = '';
  filtroSector = '';
  filtroSexo = '';

  ciudadanoAEliminar: Ciudadano | null = null;

  form: FormGroup;

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  // Modales
  @ViewChild('formModal') formModalRef!: ElementRef;
  @ViewChild('importModal') importModalRef!: ElementRef;

  private modal: any;
  private importModalInstance: any;

  excelData: any[] = [];
  importProcessing = false;
  mostrarTabla = false;

  constructor(
    private censoService: CensoPoblacionalService,
    private fb: FormBuilder,
    private toast: ToastService,
    private dsService: DesignSystemService,
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      id_ciudadano: [null],
      nombres: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8,15}$')]],
      direccion: ['', Validators.required],
      edad: [null, [Validators.min(0)]],
      sexo: ['M', Validators.required],
      estado_civil: ['Soltero'],
      id_sector: [null, Validators.required],
      situacion_laboral: ['Empleado'],
      fecha_nacimiento: [null],
      es_padre_madre: [false],
      cantidad_hijos: [0, Validators.min(0)],
      tiene_discapacidad: [false],
      tipo_discapacidad: [''],
      id_organizaciones: [[]]
    });
  }

  ngOnInit() {
    this.cv = this.dsService.getCrudViewFor('censo-poblacional');
    this.isFiltersCollapsed = this.cv.collapsibleFilters;
    this.inicializarDataTable();
    this.loadSectores();
    this.loadOrganizaciones();
    this.loadData();
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  inicializarDataTable() {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      responsive: true,
      autoWidth: false,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'asc']], // Nombres
      columnDefs: [
        { targets: [0, 5], orderable: false }
      ]
    };
  }

  loadSectores() {
    this.censoService.getSectores().subscribe(res => this.sectores = res.data);
  }

  loadOrganizaciones() {
    this.censoService.getOrganizaciones().subscribe(res => this.organizaciones = res.data);
  }

  loadData() {
    if (this.ciudadanos.length === 0) {
      this.loading = true;
    }
    this.censoService.getCiudadanos().subscribe({
      next: (res) => {
        this.ciudadanos = res.data;
        this.aplicarFiltros(true);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private triggerDataTable() {
    // Destrucción limpia apagando la tabla del DOM completamente
    this.mostrarTabla = false;
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        this.reconstruirTabla();
      }).catch(() => {
        this.reconstruirTabla();
      });
    } else {
      this.reconstruirTabla();
    }
  }

  private reconstruirTabla() {
    setTimeout(() => {
      this.mostrarTabla = true;
      setTimeout(() => {
        this.safeDtTriggerNext();
      }, 150);
    }, 10);
  }

  onFilterChange() {
    this.aplicarFiltros(false);
    this.triggerDataTable();
  }

  aplicarFiltros(isInitialLoad: boolean = false) {
    let result = [...this.ciudadanos];
    if (this.filtroSearch) {
      const q = this.filtroSearch.toLowerCase();
      result = result.filter(c =>
        c.nombres.toLowerCase().includes(q) || c.dni.includes(q)
      );
    }
    if (this.filtroSector) {
      result = result.filter(c => c.id_sector == +this.filtroSector);
    }
    if (this.filtroSexo) {
      result = result.filter(c => c.sexo === this.filtroSexo);
    }
    this.ciudadanosFiltrados = result;
    if (isInitialLoad) {
      this.triggerDataTable();
    }
  }

  limpiarFiltros() {
    this.filtroSearch = '';
    this.filtroSector = '';
    this.filtroSexo = '';
    this.aplicarFiltros(false);
    this.triggerDataTable();
  }

  private openBootstrapModal(el: ElementRef): any {
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      const instance = new bootstrap.Modal(el.nativeElement);
      instance.show();
      return instance;
    } else {
      $(el.nativeElement).modal('show');
      return null;
    }
  }

  private hideBootstrapModal(instance: any, el: ElementRef): void {
    if (instance && instance.hide) {
      instance.hide();
    } else {
      $(el.nativeElement).modal('hide');
    }
  }

  openModal(ciudadano: Ciudadano | null = null) {
    this.isEditing = !!ciudadano;
    if (ciudadano) {
      this.form.patchValue(ciudadano);
      if (ciudadano.tiene_discapacidad) {
        this.form.get('tipo_discapacidad')?.setValidators(Validators.required);
      } else {
        this.form.get('tipo_discapacidad')?.clearValidators();
      }
      this.form.get('tipo_discapacidad')?.updateValueAndValidity();
    } else {
      this.form.reset({
        sexo: 'M',
        estado_civil: 'Soltero',
        situacion_laboral: 'Empleado',
        es_padre_madre: false,
        cantidad_hijos: 0,
        tiene_discapacidad: false,
        tipo_discapacidad: ''
      });
      this.form.get('tipo_discapacidad')?.clearValidators();
      this.form.get('tipo_discapacidad')?.updateValueAndValidity();
    }

    // Set selected organizations for the form
    if (ciudadano && ciudadano.organizaciones) {
      this.form.get('id_organizaciones')?.setValue(ciudadano.organizaciones.map(o => o.id_organizacion));
    } else {
      this.form.get('id_organizaciones')?.setValue([]);
    }

    setTimeout(() => {
      this.modal = this.openBootstrapModal(this.formModalRef);
      // Ensure age is calculated if DOB exists
      this.recalcularEdad();
      this.initSelect2Sector();
      this.initSelect2Organizaciones();
    }, 0);
  }

  recalcularEdad() {
    const fn = this.form.get('fecha_nacimiento')?.value;
    if (fn) {
      const birth = new Date(fn);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      this.form.patchValue({ edad: age }, { emitEvent: false });
    }
  }

  initSelect2Sector(): void {
    if (typeof $ === 'undefined' || !this.formModalRef?.nativeElement) return;
    const $modal = $(this.formModalRef.nativeElement);
    const $select = $modal.find('#id_sector_select');
    if ($select.length === 0) return;
    try {
      if ($select.data('select2')) $select.select2('destroy');
    } catch (_) { }
    const opts = this.dsService.getSelect2Options({
      dropdownParent: $modal,
      allowClear: false,
      placeholder: 'Seleccione sector'
    });
    $select.select2(opts).on('change', (e: any) => {
      const val = $(e.target).val();
      this.form.get('id_sector')?.setValue(val ? +val : null);
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('censo-poblacional');
    setTimeout(() => {
      $select.next('.select2-container').find('.select2-selection').addClass(sizeClass);
    }, 0);
    const currentVal = this.form.get('id_sector')?.value;
    $select.val(currentVal != null ? String(currentVal) : '').trigger('change.select2');
  }

  initSelect2Organizaciones(): void {
    if (typeof $ === 'undefined' || !this.formModalRef?.nativeElement) return;
    const $modal = $(this.formModalRef.nativeElement);
    const $select = $modal.find('#id_organizaciones_select');
    if ($select.length === 0) return;
    try {
      if ($select.data('select2')) $select.select2('destroy');
    } catch (_) { }
    const opts = this.dsService.getSelect2Options({
      dropdownParent: $modal,
      allowClear: true,
      placeholder: 'Seleccione organizaciones',
      multiple: true
    } as any);
    $select.select2(opts).on('change', (e: any) => {
      // In multiple Select2, .val() returns an array of strings
      const val = $(e.target).val() as string[];
      this.form.get('id_organizaciones')?.setValue(val ? val.map((v: any) => +v) : []);
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('censo-poblacional');
    setTimeout(() => {
      $select.next('.select2-container').find('.select2-selection').addClass(sizeClass);
    }, 0);
    const currentVal = this.form.get('id_organizaciones')?.value;
    $select.val(currentVal || []).trigger('change.select2');
  }

  onDiscapacidadChange() {
    const isChecked = this.form.get('tiene_discapacidad')?.value;
    const tipoCtrl = this.form.get('tipo_discapacidad');
    if (isChecked) {
      tipoCtrl?.setValidators(Validators.required);
    } else {
      tipoCtrl?.clearValidators();
      tipoCtrl?.setValue('');
    }
    tipoCtrl?.updateValueAndValidity();
  }

  onPadreMadreChange() {
    const isChecked = this.form.get('es_padre_madre')?.value;
    const hijosCtrl = this.form.get('cantidad_hijos');
    if (!isChecked) {
      hijosCtrl?.setValue(0);
    }
  }

  closeModal() {
    this.hideBootstrapModal(this.modal, this.formModalRef);
  }

  confirmDelete(ciudadano: Ciudadano) {
    this.ciudadanoAEliminar = ciudadano;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'censo-poblacional';
    ref.componentInstance.title = 'Eliminar ciudadano';
    ref.componentInstance.message = `¿Está seguro de eliminar a «${ciudadano.nombres}» (DNI ${ciudadano.dni})?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => this.delete(),
      () => { this.ciudadanoAEliminar = null; }
    );
  }

  delete() {
    if (!this.ciudadanoAEliminar) return;
    this.deleting = true;
    this.censoService.deleteCiudadano(this.ciudadanoAEliminar.id_ciudadano).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Registro eliminado');
          this.ciudadanoAEliminar = null;
          this.loadData();
        } else {
          this.toast.error('No se pudo eliminar el registro');
        }
        this.deleting = false;
      },
      error: () => {
        this.toast.error('Error de conexión');
        this.deleting = false;
      }
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;

    // Prepare data for backend
    const data = { ...this.form.value };

    // Format organizations as objects for the backend service (CenCiudadanoService expects {id_organizacion, fecha_afiliacion})
    if (data.id_organizaciones) {
      const ids = data.id_organizaciones;
      data.organizaciones = (Array.isArray(ids) ? ids : []).map((id: number) => ({
        id_organizacion: +id,
        fecha_afiliacion: new Date().toISOString().split('T')[0]
      }));
      delete data.id_organizaciones;
    }

    // Clean null id_ciudadano to avoid insertion issues
    if (data.id_ciudadano === null) {
      delete data.id_ciudadano;
    }

    this.censoService.saveCiudadano(data).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(this.isEditing ? 'Ciudadano actualizado' : 'Ciudadano registrado');
          this.closeModal();
          this.loadData();
        } else {
          this.toast.error(res.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: () => {
        this.toast.error('Error de conexión con el servidor');
        this.saving = false;
      }
    });
  }

  // ==================== IMPORTACIÓN EXCEL ====================
  openImportModal() {
    this.excelData = [];
    setTimeout(() => { this.importModalInstance = this.openBootstrapModal(this.importModalRef); }, 0);
  }

  closeImportModal() {
    this.hideBootstrapModal(this.importModalInstance, this.importModalRef);
    this.excelData = [];
  }

  descargarPlantilla() {
    const plantilla = [{
      dni: '12345678',
      nombres: 'JUAN PEREZ (EJEMPLO)',
      fecha_nacimiento: '1990-05-15',
      direccion: 'AV CHILE 123',
      edad: 30, // Se autocalculará si mandas fecha de nacimiento, pero mantén la columna por seguridad
      sexo: 'M',
      estado_civil: 'SOLTERO',
      id_sector: this.sectores[0]?.id_sector || 1,
      situacion_laboral: 'EMPLEADO',
      es_padre_madre: 'TRUE',
      cantidad_hijos: 2,
      tiene_discapacidad: 'FALSE',
      tipo_discapacidad: ''
    }];
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(plantilla);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_importacion_ciudadanos.xlsx');
  }

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) {
      this.toast.warning('No se puede procesar más de un archivo');
      return;
    }
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];
        let data: any[] = XLSX.utils.sheet_to_json(ws);

        // Normalize columns: ensure DNI is always a string to prevent backend validation errors
        this.excelData = data.map(row => {
          return {
            ...row,
            dni: row.dni !== undefined && row.dni !== null ? String(row.dni) : '',
            nombres: row.nombres ? String(row.nombres) : '',
            direccion: row.direccion ? String(row.direccion) : '',
            sexo: row.sexo ? String(row.sexo) : '',
            es_padre_madre: row.es_padre_madre === 'TRUE' || row.es_padre_madre === true || row.es_padre_madre === 1,
            tiene_discapacidad: row.tiene_discapacidad === 'TRUE' || row.tiene_discapacidad === true || row.tiene_discapacidad === 1,
            cantidad_hijos: row.cantidad_hijos || 0,
            tipo_discapacidad: row.tipo_discapacidad ? String(row.tipo_discapacidad) : '',
            fecha_nacimiento: row.fecha_nacimiento ? String(row.fecha_nacimiento) : ''
          };
        });
      } catch (err) {
        this.toast.error('Ocurrió un error leyendo el Excel. Verifique el formato.');
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }

  procesarImportacion() {
    if (!this.excelData || this.excelData.length === 0) {
      this.toast.warning('No hay datos válidos para procesar');
      return;
    }

    const firstRow = this.excelData[0];
    if (!('dni' in firstRow) || !('nombres' in firstRow) || !('id_sector' in firstRow)) {
      this.toast.error('El formato del Excel no coincide con la plantilla. Verifique los nombres de las columnas en minúscula (dni, nombres, id_sector, etc).');
      return;
    }

    this.importProcessing = true;
    this.censoService.importarCiudadanos(this.excelData).subscribe({
      next: (res) => {
        if (res.success) {
          const data = res.data;
          this.toast.success(`Importación exitosa. ${data.registrados} nuevos, ${data.existentes} ya existían.`);
          this.loadData();
          this.closeImportModal();
        } else {
          this.toast.error(res.message || 'Error al importar');
        }
        this.importProcessing = false;
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error en el proceso de importación del servidor.';
        this.toast.error(msg);
        this.importProcessing = false;
      }
    });
  }

  // ==================== EXPORTACIÓN ====================

  onExportExcel() {
    const rows = this.ciudadanosFiltrados.map(c => ({
      DNI: c.dni,
      Nombres: c.nombres,
      FecNacimiento: c.fecha_nacimiento || '-',
      Edad: c.edad,
      Sexo: c.sexo,
      PadreMadre: c.es_padre_madre ? 'SI' : 'NO',
      NumHijos: c.cantidad_hijos || 0,
      Discapacitado: c.tiene_discapacidad ? 'SI' : 'NO',
      TipoDiscapacidad: c.tipo_discapacidad || '-',
      Sector: c.sector?.nombre_sector || '-',
      EstadoCivil: c.estado_civil || '-',
      SituacionLaboral: c.situacion_laboral || '-',
      Direccion: c.direccion
    }));
    const csv = this.toCsv(rows);
    this.downloadFile(csv, 'padron-ciudadanos.csv', 'text/csv');
    this.toast.success('Exportación Excel generada');
  }

  onExportPdf() {
    window.print();
  }

  private toCsv(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
    return `${header}\n${body}`;
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
