import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentoService } from '../services/documento.service';
import { CatalogoService } from '../services/catalogo.service';
import { Area, TipoDocumento } from '../models/documento.model';

@Component({
  selector: 'app-cargar-documento',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cargar-documento.component.html',
  styleUrls: ['./cargar-documento.component.scss']
})
export class CargarDocumentoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Catálogos
  areas: Area[] = [];
  tiposDocumento: TipoDocumento[] = [];
  clasificaciones: any[] = [];

  // Formulario
  formData = {
    titulo: '',
    descripcion: '',
    tipo_documento_id: null as number | null,
    area_id: null as number | null,
    clasificacion: 'publico',
    fecha_documento: new Date().toISOString().split('T')[0],
    numero_documento: '',
    asunto: '',
    palabras_clave: '',
    dpi: null as number | null,
    paginas: 1,
    area_codigo: '',
    tipo_documento_codigo: ''
  };

  selectedFile: File | null = null;
  filePreview: {
    name: string;
    size: number;
    type: string;
    extension: string;
  } | null = null;

  loading = false;

  // Scanner support
  modoCaptura: 'archivo' | 'escaner' = 'archivo';
  showScannerModal = false;
  scannerDisponible = false;
  escaneando = false;
  paginasEscaneadas: any[] = [];
  errors: any = {};
  
  maxFileSize = 20480; // KB (20MB)
  allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif'];

  constructor(
    private documentoService: DocumentoService,
    private catalogoService: CatalogoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCatalogos();
    this.verificarDisponibilidadEscaner();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============ FUNCIONES DE ESCÁNER ============
  
  verificarDisponibilidadEscaner(): void {
    // Verificar si el navegador soporta getUserMedia (para cámara como escáner)
    // o si hay un servicio TWAIN instalado
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      this.scannerDisponible = true;
      console.log('✅ Soporte de captura de imágenes disponible');
    } else {
      this.scannerDisponible = false;
      console.log('⚠️ No se detectó soporte para captura de imágenes');
    }
  }

  cambiarModoCaptura(modo: 'archivo' | 'escaner'): void {
    this.modoCaptura = modo;
    if (modo === 'escaner' && this.scannerDisponible) {
      this.openScannerModal();
    }
  }

  openScannerModal(): void {
    this.showScannerModal = true;
    this.paginasEscaneadas = [];
  }

  closeScannerModal(): void {
    this.showScannerModal = false;
    this.escaneando = false;
    this.paginasEscaneadas = [];
  }

  iniciarEscaneo(): void {
    this.escaneando = true;
    
    // Simular escaneo (en producción, esto llamaría al driver del escáner)
    // Usando input file como alternativa temporal
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = false;
    
    // Si el dispositivo tiene cámara, permitir captura directa
    if (navigator.mediaDevices) {
      fileInput.setAttribute('capture', 'environment');
    }
    
    fileInput.onchange = (e: any) => {
      const file = e.target?.files[0];
      if (file) {
        this.agregarPaginaEscaneada(file);
      }
      this.escaneando = false;
    };
    
    fileInput.click();
  }

  agregarPaginaEscaneada(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.paginasEscaneadas.push({
        file: file,
        preview: e.target.result,
        nombre: `Página ${this.paginasEscaneadas.length + 1}`,
        tamano: file.size
      });
      
      console.log(`✅ Página escaneada: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }

  eliminarPaginaEscaneada(index: number): void {
    this.paginasEscaneadas.splice(index, 1);
  }

  confirmarEscaneo(): void {
    if (this.paginasEscaneadas.length === 0) {
      alert('No hay páginas escaneadas');
      return;
    }

    // Si hay una sola página, usarla directamente
    if (this.paginasEscaneadas.length === 1) {
      this.selectedFile = this.paginasEscaneadas[0].file;
      this.onFileSelected({ target: { files: [this.selectedFile] } } as any);
      this.closeScannerModal();
    } else {
      // Si hay múltiples páginas, necesitamos combinarlas en un PDF
      alert(`Se escanearon ${this.paginasEscaneadas.length} páginas.\nPróximamente se implementará la combinación automática en PDF.`);
      // Por ahora, usar la primera página
      this.selectedFile = this.paginasEscaneadas[0].file;
      this.onFileSelected({ target: { files: [this.selectedFile] } } as any);
      this.closeScannerModal();
    }
  }

  loadCatalogos(): void {
    this.catalogoService.obtenerAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(areas => this.areas = areas);

    this.catalogoService.obtenerTiposDocumento()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipos => this.tiposDocumento = tipos);

    this.catalogoService.obtenerClasificaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clasificaciones => this.clasificaciones = clasificaciones);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validar extensión
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!this.allowedExtensions.includes(extension)) {
      alert(`Extensión de archivo no permitida. Solo se permiten: ${this.allowedExtensions.join(', ')}`);
      event.target.value = '';
      return;
    }

    // Validar tamaño
    const sizeKB = file.size / 1024;
    if (sizeKB > this.maxFileSize) {
      alert(`El archivo excede el tamaño máximo permitido de ${this.maxFileSize}KB (${this.maxFileSize/1024}MB)`);
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.filePreview = {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: extension
    };
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
    const fileInput = document.getElementById('archivo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onAreaChange(): void {
    const area = this.areas.find(a => a.id === this.formData.area_id);
    if (area) {
      this.formData.area_codigo = area.codigo;
    }
  }

  onTipoDocumentoChange(): void {
    const tipo = this.tiposDocumento.find(t => t.id === this.formData.tipo_documento_id);
    if (tipo) {
      this.formData.tipo_documento_codigo = tipo.codigo;
      // Pre-seleccionar clasificación si el tipo lo define
      this.formData.clasificacion = tipo.clasificacion;
    }
  }

  validateForm(): boolean {
    this.errors = {};

    if (!this.formData.titulo || this.formData.titulo.trim() === '') {
      this.errors.titulo = 'El título es obligatorio';
    }

    if (!this.formData.tipo_documento_id) {
      this.errors.tipo_documento_id = 'El tipo de documento es obligatorio';
    }

    if (!this.formData.area_id) {
      this.errors.area_id = 'El área es obligatoria';
    }

    if (!this.selectedFile) {
      this.errors.archivo = 'Debe seleccionar un archivo';
    }

    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      alert('Por favor, complete todos los campos obligatorios');
      return;
    }

    this.loading = true;

    // Preparar FormData
    const formData = new FormData();
    formData.append('titulo', this.formData.titulo);
    if (this.formData.descripcion) formData.append('descripcion', this.formData.descripcion);
    formData.append('tipo_documento_id', this.formData.tipo_documento_id!.toString());
    formData.append('area_id', this.formData.area_id!.toString());
    formData.append('clasificacion', this.formData.clasificacion);
    formData.append('fecha_documento', this.formData.fecha_documento);
    if (this.formData.numero_documento) formData.append('numero_documento', this.formData.numero_documento);
    if (this.formData.asunto) formData.append('asunto', this.formData.asunto);
    if (this.formData.palabras_clave) formData.append('palabras_clave', this.formData.palabras_clave);
    if (this.formData.dpi) formData.append('dpi', this.formData.dpi.toString());
    formData.append('paginas', this.formData.paginas.toString());
    formData.append('area_codigo', this.formData.area_codigo);
    formData.append('tipo_documento_codigo', this.formData.tipo_documento_codigo);
    formData.append('archivo', this.selectedFile!);

    this.documentoService.crear(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert('Documento creado exitosamente');
            this.router.navigate(['/gestion-documental/lista']);
          } else {
            alert('Error al crear documento: ' + response.message);
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error creando documento:', error);
          const message = error.error?.message || 'Error al crear documento';
          alert(message);
          this.loading = false;
        }
      });
  }

  onCancel(): void {
    if (confirm('¿Está seguro de cancelar? Se perderán los datos ingresados.')) {
      this.router.navigate(['/gestion-documental/lista']);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(extension: string): string {
    const icons: { [key: string]: string } = {
      'pdf': 'fas fa-file-pdf text-danger',
      'jpg': 'fas fa-file-image text-primary',
      'jpeg': 'fas fa-file-image text-primary',
      'png': 'fas fa-file-image text-primary',
      'tiff': 'fas fa-file-image text-primary',
      'tif': 'fas fa-file-image text-primary'
    };
    return icons[extension] || 'fas fa-file';
  }
}

