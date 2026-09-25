import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { OrganizationalUnitService, OrganizationalUnit } from '../../../services/organizational-unit.service';
import type { Config } from 'datatables.net';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-unidades-organicas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './unidades-organicas.component.html',
  styleUrls: ['./unidades-organicas.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
})
export class UnidadesOrganicasComponent implements OnInit, OnDestroy {
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  @ViewChild('unidadModal') unidadModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  unidades: OrganizationalUnit[] = [];
  selectedUnidad: OrganizationalUnit | null = null;
  unidadForm!: FormGroup;
  isEditMode = false;
  saving = false;

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private unidadModal: any;
  private viewModal: any;

  // Tabs control
  activeTab: 'table' | 'tree' | 'chart' = 'table';
  organizationalTree: any[] = [];
  
  // Mock data de gerentes
  mockManagers: { [key: number]: { name: string, position: string, photo?: string } } = {};

  constructor(
    private organizationalUnitService: OrganizationalUnitService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private modalService: NgbModal
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    this.loadUnidades();
    this.initMockManagers();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initForm(): void {
    this.unidadForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      level: [1, Validators.required],
      parent_id: [null],
      is_active: [true]
    });
  }

  initDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      stateSave: true,
      stateDuration: 0,
      language: {
        url: 'assets/datatables/i18n/es-ES.json'
      },
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      order: [[1, 'asc']], // Ordenar por nombre
      columnDefs: [
        { targets: -1, orderable: false, searchable: false } // Columna de acciones
      ]
    };
  }

  loadUnidades(): void {
    console.log('🔄 Cargando unidades orgánicas desde API...');
    this.organizationalUnitService.getAll().subscribe({
      next: (response) => {
        console.log('✅ Respuesta de API:', response);
        if (response.success) {
          this.unidades = response.data;
          this.buildOrganizationalTree();
          if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
          console.log(`✅ ${this.unidades.length} unidades orgánicas cargadas`);
        } else {
          console.warn('⚠️ API respondió pero success=false:', response);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando unidades orgánicas:', error);
      }
    });
  }

  buildOrganizationalTree(): void {
    // Crear un mapa de unidades por ID
    const unidadesMap = new Map<number, any>();
    this.unidades.forEach(unidad => {
      unidadesMap.set(unidad.id!, {
        ...unidad,
        children: [],
        expanded: true, // Para el árbol (chevrons)
        detailsExpanded: false // Para el organigrama (detalles)
      });
    });

    // Construir el árbol jerárquico
    const tree: any[] = [];
    unidadesMap.forEach(unidad => {
      if (unidad.parent_id) {
        const parent = unidadesMap.get(unidad.parent_id);
        if (parent) {
          parent.children.push(unidad);
        } else {
          tree.push(unidad); // Si no encuentra el padre, lo pone en raíz
        }
      } else {
        tree.push(unidad); // Unidades sin padre van a la raíz
      }
    });

    this.organizationalTree = tree;
    console.log('🌳 Árbol organizacional construido:', this.organizationalTree);
  }

  toggleNode(node: any): void {
    node.expanded = !node.expanded;
  }

  expandAll(): void {
    this.expandCollapseAll(this.organizationalTree, true);
  }

  collapseAll(): void {
    this.expandCollapseAll(this.organizationalTree, false);
  }

  private expandCollapseAll(nodes: any[], expand: boolean): void {
    nodes.forEach(node => {
      node.expanded = expand;
      if (node.children && node.children.length > 0) {
        this.expandCollapseAll(node.children, expand);
      }
    });
  }

  switchTab(tab: 'table' | 'tree' | 'chart'): void {
    this.activeTab = tab;
  }

  initMockManagers(): void {
    // Datos mock de gerentes para cada unidad
    this.mockManagers = {
      1: { name: 'Carlos Mendoza Ruiz', position: 'Gerente General' },
      2: { name: 'María García López', position: 'Gerente de Administración' },
      3: { name: 'Juan Pérez Santos', position: 'Gerente de Operaciones' },
      4: { name: 'Ana Torres Vega', position: 'Jefa de Finanzas' },
      5: { name: 'Luis Rodríguez Castro', position: 'Jefe de RRHH' },
      6: { name: 'Carmen Silva Díaz', position: 'Jefa de Producción' },
      7: { name: 'Roberto Flores Morales', position: 'Jefe de Logística' },
      8: { name: 'Patricia Guzmán Ortiz', position: 'Gerente de Tecnología' },
      9: { name: 'Fernando Vargas Luna', position: 'Jefe de Sistemas' },
      10: { name: 'Sandra Ramos Campos', position: 'Jefa de Soporte' }
    };
  }

  getManagerForNode(node: any): { name: string, position: string } {
    return this.mockManagers[node.id] || { 
      name: 'Por Asignar', 
      position: 'Sin responsable' 
    };
  }

  toggleBoxDetails(node: any): void {
    node.detailsExpanded = !node.detailsExpanded;
  }

  expandAllBoxes(): void {
    this.toggleAllBoxes(this.organizationalTree, true);
  }

  collapseAllBoxes(): void {
    this.toggleAllBoxes(this.organizationalTree, false);
  }

  private toggleAllBoxes(nodes: any[], expand: boolean): void {
    nodes.forEach(node => {
      node.detailsExpanded = expand;
      if (node.children && node.children.length > 0) {
        this.toggleAllBoxes(node.children, expand);
      }
    });
  }

  reloadTable(): void {
    this.organizationalUnitService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          this.unidades = response.data;
          // Orden estable por nombre antes de re-render
          this.unidades.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          this.buildOrganizationalTree();
        }
      },
      error: (error) => {
        console.error('❌ Error recargando tabla:', error);
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedUnidad = null;
    this.unidadForm.reset({
      code: '',
      name: '',
      description: '',
      level: 1,
      parent_id: null,
      is_active: true
    });
    this.showModal('unidadModal');
  }

  openEditModal(unidad: OrganizationalUnit): void {
    this.isEditMode = true;
    this.selectedUnidad = unidad;
    this.unidadForm.patchValue({
      code: unidad.code,
      name: unidad.name,
      description: unidad.description,
      level: unidad.level,
      parent_id: unidad.parent_id,
      is_active: unidad.is_active
    });
    this.showModal('unidadModal');
  }

  openViewModal(unidad: OrganizationalUnit): void {
    this.selectedUnidad = unidad;
    this.showModal('viewModal');
  }

  private showModal(modalId: string): void {
    const modalElement = modalId === 'unidadModal' ? this.unidadModalRef : this.viewModalRef;
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement.nativeElement);
      if (modalId === 'unidadModal') {
        this.unidadModal = modal;
      } else {
        this.viewModal = modal;
      }
      modal.show();
    }
  }

  private hideModal(modalId: string): void {
    const modal = modalId === 'unidadModal' ? this.unidadModal : this.viewModal;
    if (modal) {
      modal.hide();
    }
  }

  closeModal(): void {
    if (this.unidadModal) {
      this.unidadModal.hide();
    }
  }

  closeViewModal(): void {
    if (this.viewModal) {
      this.viewModal.hide();
    }
  }

  saveUnidad(): void {
    if (this.unidadForm.invalid) {
      Object.keys(this.unidadForm.controls).forEach(key => {
        this.unidadForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const formValue = this.unidadForm.value;

    const operation = this.isEditMode
      ? this.organizationalUnitService.update(this.selectedUnidad!.id!, formValue)
      : this.organizationalUnitService.create(formValue);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.hideModal('unidadModal');
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('❌ Error guardando unidad orgánica:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(unidad: OrganizationalUnit): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${unidad.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.organizationalUnitService.delete(unidad.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }
}
