import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentoService } from '../services/documento.service';
import { CatalogoService } from '../services/catalogo.service';
import { Documento, DocumentoFiltros, Area, TipoDocumento, Usuario } from '../models/documento.model';

@Component({
  selector: 'app-lista-documentos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lista-documentos.component.html',
  styleUrls: ['./lista-documentos.component.scss']
})
export class ListaDocumentosComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // UI Tabs
  activeTab: 'gestor' | 'compartidos' | 'estadisticas' = 'gestor';

  setTab(tab: 'gestor' | 'compartidos' | 'estadisticas'): void {
    this.activeTab = tab;
    try { localStorage.setItem('gd_active_tab', tab); } catch {}
    
    // Cargar datos según la pestaña
    if (tab === 'compartidos') {
      this.loadCompartidosConmigo();
    } else if (tab === 'gestor') {
      this.loadDocumentos();
    }
  }

  documentos: Documento[] = [];
  compartidosConmigo: any[] = [];
  loading = false;
  
  // Catálogos
  areas: Area[] = [];
  tiposDocumento: TipoDocumento[] = [];
  clasificaciones: any[] = [];
  estados: any[] = [];
  usuarios: Usuario[] = [];

  // Filtros
  filtros: DocumentoFiltros = {
    per_page: 15,
    page: 1
  };

  // Paginación
  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15,
    from: 0,
    to: 0
  };

  // DataTable controls (client-side UI helpers)
  dt = {
    pageSize: 15 as 10 | 15 | 25 | 50,
    search: ''
  };

  // Clipboard for move
  clipboardDocs: number[] = [];
  selection: { [id: number]: boolean } = {};

  toggleSelect(docId: number, checked: boolean): void {
    if (checked) this.selection[docId] = true; else delete this.selection[docId];
  }

  copySelected(): void {
    this.clipboardDocs = Object.keys(this.selection).map(id => +id);
    alert(`${this.clipboardDocs.length} documentos copiados al portapapeles`);
  }

  // Stats
  stats = {
    total: 0,
    firmados: 0,
    bloqueados: 0,
    pendientes: 0,
    porTipo: [] as Array<{ nombre: string; total: number }>,
    porClasificacion: [] as Array<{ nombre: string; total: number }>,
    porArea: [] as Array<{ nombre: string; total: number }>
  };

  // Share modal state
  showShareModal = false;
  shareTarget: Documento | null = null;
  shareForm = {
    usuario_id: null as number | null,
    permiso: 'solo-lectura' as string,
    mensaje: ''
  };

  // Niveles de permiso disponibles
  nivelesPermiso = [
    { 
      value: 'solo-lectura', 
      label: 'Solo Lectura', 
      descripcion: 'Solo puede visualizar el documento (sin descargar)',
      icono: 'fa-eye',
      color: 'info'
    },
    { 
      value: 'lectura-descarga', 
      label: 'Lectura y Descarga', 
      descripcion: 'Puede ver y descargar el documento',
      icono: 'fa-download',
      color: 'primary'
    },
    { 
      value: 'comentar', 
      label: 'Comentar', 
      descripcion: 'Puede ver, descargar y agregar comentarios',
      icono: 'fa-comment',
      color: 'info'
    },
    { 
      value: 'edicion', 
      label: 'Edición', 
      descripcion: 'Puede ver, descargar y editar metadatos',
      icono: 'fa-edit',
      color: 'warning'
    },
    { 
      value: 'edicion-completa', 
      label: 'Edición Completa', 
      descripcion: 'Puede ver, descargar, editar y crear nuevas versiones',
      icono: 'fa-file-alt',
      color: 'warning'
    },
    { 
      value: 'administrar', 
      label: 'Administrar', 
      descripcion: 'Control total: editar, eliminar, compartir con otros',
      icono: 'fa-user-shield',
      color: 'danger'
    }
  ];

  openShareModal(doc: Documento): void {
    this.shareTarget = doc;
    this.shareForm = {
      usuario_id: null,
      permiso: 'solo-lectura',
      mensaje: ''
    };
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.shareTarget = null;
  }

  onConfirmShare(): void {
    if (!this.shareTarget || !this.shareForm.usuario_id) {
      alert('Seleccione un usuario destino');
      return;
    }

    this.documentoService.compartir(
      this.shareTarget.id,
      this.shareForm.usuario_id,
      this.shareForm.permiso,
      this.shareForm.mensaje || undefined
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            const nivel = this.nivelesPermiso.find(n => n.value === this.shareForm.permiso);
            alert(`✅ Documento compartido con permiso: ${nivel?.label || this.shareForm.permiso}`);
            this.closeShareModal();
          } else {
            alert(resp.message || 'No se pudo compartir');
          }
        },
        error: (err) => {
          console.error(err);
          alert(err.error?.message || 'Error al compartir');
        }
      });
  }

  getPermisoInfo(permiso: string) {
    return this.nivelesPermiso.find(n => n.value === permiso) || {
      value: permiso,
      label: permiso,
      descripcion: '',
      icono: 'fa-question',
      color: 'secondary'
    };
  }

  toggleBloqueo(doc: Documento): void {
    // Prevenir intento de desbloqueo de documentos bloqueados por cierre
    if (doc.bloqueado && doc.cierre_id) {
      alert('⚠️ Este documento está bloqueado por un cierre de periodo.\n\n' +
            'No se puede desbloquear manualmente.\n\n' +
            'Para desbloquearlo, debe rechazar el cierre desde "Archivo Central".');
      return;
    }

    const accion = doc.bloqueado ? 'desbloquear' : 'bloquear';
    const confirmacion = confirm(
      `¿Estás seguro de ${accion} este documento?\n\n` +
      `"${doc.titulo}"\n\n` +
      (doc.bloqueado ? 
        'Al desbloquearlo, podrá ser editado nuevamente.' : 
        'Al bloquearlo, no podrá ser editado hasta que lo desbloquees.')
    );
    
    if (!confirmacion) {
      return;
    }

    this.documentoService.toggleBloqueo(doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.success && resp.data) {
            const icono = resp.data.bloqueado ? '🔒' : '🔓';
            alert(`${icono} ${resp.message}`);
            // Actualizar el documento en la lista
            const index = this.documentos.findIndex(d => d.id === doc.id);
            if (index !== -1) {
              this.documentos[index].bloqueado = resp.data.bloqueado;
            }
          } else {
            alert(resp.message || 'No se pudo cambiar el estado de bloqueo');
          }
        },
        error: (err) => {
          console.error('Error al cambiar bloqueo:', err);
          alert('❌ ' + (err.error?.message || 'Error al cambiar estado de bloqueo'));
        }
      });
  }

  // Folder navigation state
  currentFolderId: number | null = null;
  sidebarFolders: any[] = [];
  contentFolders: any[] = [];
  breadcrumb: Array<{ id: number; nombre: string }> = [];

  // Tree view state
  folderTree: Array<{ id: number; nombre: string; expanded: boolean; loaded: boolean; loading?: boolean; children: any[] }>= [];

  // Create folder modal
  showCreateFolderModal = false;
  newFolder = { nombre: '', parent_id: null as number | null };

  // Move document modal
  showMoveModal = false;
  moveTarget: Documento | null = null;
  moveForm = { carpeta_id: null as number | null };

  openMoveModal(doc: Documento): void {
    this.moveTarget = doc;
    this.moveForm = { carpeta_id: this.currentFolderId };
    this.showMoveModal = true;
  }

  closeMoveModal(): void {
    this.showMoveModal = false;
    this.moveTarget = null;
  }

  onConfirmMove(): void {
    if (!this.moveTarget) return;
    const documentoId = this.moveTarget.id;
    const payload = { carpeta_id: this.moveForm.carpeta_id };
    // Reuse catalogo.service to call mover endpoint quickly via HttpClient
    const url = `${(window as any).env?.apiUrl || ''}`; // fallback, but we have environment in services
    this.catalogoService
      .crearCarpeta // dummy access to keep ts happy with import usage
    ;
    // We'll call using DocumentoService (add a small helper?)
    (this.documentoService as any).http.post(`${(this.documentoService as any).apiUrl.replace('/documentos','')}/documentos/${documentoId}/mover`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeMoveModal();
          this.loadDocumentos();
        },
        error: (err: any) => {
          console.error(err);
          alert(err.error?.message || 'Error al mover documento');
        }
      });
  }

  constructor(
    private documentoService: DocumentoService,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem('gd_active_tab');
      if (saved === 'gestor' || saved === 'estadisticas' || saved === 'compartidos') {
        this.activeTab = saved as any;
      }
    } catch {}
    this.loadSidebarFolders();
    this.loadFolderContent();
    this.loadCatalogos();
    
    // Cargar datos según la pestaña activa
    if (this.activeTab === 'compartidos') {
      this.loadCompartidosConmigo();
    } else {
    this.loadDocumentos();
    }
  }

  ngAfterViewInit(): void {
    // Invocar init global para asegurar treeview
    setTimeout(() => {
      try { (window as any).initSidebarTreeview && (window as any).initSidebarTreeview(); } catch {}
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    this.catalogoService.obtenerEstados()
      .pipe(takeUntil(this.destroy$))
      .subscribe(estados => this.estados = estados);

    this.catalogoService.obtenerUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarios) => {
          this.usuarios = usuarios;
          console.log('✅ Usuarios cargados:', usuarios.length);
        },
        error: (err) => {
          console.error('❌ Error al cargar usuarios:', err);
          this.usuarios = [];
        }
      });
  }

  loadSidebarFolders(): void {
    this.catalogoService.listarCarpetas(this.filtros.area_id || undefined, null)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.sidebarFolders = list;
        this.folderTree = (list || []).map((f: any) => ({ id: f.id, nombre: f.nombre, expanded: false, loaded: false, loading: false, children: [] }));
      });
  }

  loadFolderContent(): void {
    this.catalogoService.listarCarpetas(this.filtros.area_id || undefined, this.currentFolderId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.contentFolders = list);
  }

  navigateToFolder(folderId: number | null): void {
    this.currentFolderId = folderId;
    // Update breadcrumb is simplified; in real app, fetch ancestors
    if (folderId === null) {
      this.breadcrumb = [];
    } else {
      const found = [...this.sidebarFolders, ...this.contentFolders].find(f => f.id === folderId);
      if (found) {
        this.breadcrumb = [{ id: found.id, nombre: found.nombre }];
      }
    }
    this.loadFolderContent();
    this.loadDocumentos();
  }

  openCreateFolderModal(): void {
    this.newFolder = { nombre: '', parent_id: this.currentFolderId };
    this.showCreateFolderModal = true;
  }

  closeCreateFolderModal(): void {
    this.showCreateFolderModal = false;
  }

  onCreateFolder(): void {
    if (!this.newFolder.nombre.trim()) {
      alert('Ingrese un nombre');
      return;
    }
    this.catalogoService.crearCarpeta(this.newFolder.nombre, this.newFolder.parent_id, this.filtros.area_id || null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.closeCreateFolderModal();
            this.loadSidebarFolders();
            this.loadFolderContent();
          } else {
            alert(resp.message || 'No se pudo crear la carpeta');
          }
        },
        error: (err) => {
          console.error(err);
          alert(err.error?.message || 'Error al crear carpeta');
        }
      });
  }

  // Tree handling
  toggleNode(node: any): void {
    node.expanded = !node.expanded;
    if (node.expanded && !node.loaded) {
      node.loading = true;
      this.catalogoService.listarCarpetas(this.filtros.area_id || undefined, node.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (children) => {
            node.children = (children || []).map((c: any) => ({ id: c.id, nombre: c.nombre, expanded: false, loaded: false, loading: false, children: [] }));
            node.loaded = true;
            node.loading = false;
            setTimeout(() => { try { (window as any).initSidebarTreeview && (window as any).initSidebarTreeview(); } catch {} }, 200);
          },
          error: () => { node.loading = false; }
        });
    }
    // Navegar/filtrar documentos por la carpeta clickeada
    this.navigateToFolder(node.id);
  }

  goToNode(node: any): void {
    this.navigateToFolder(node.id);
  }

  // Context menu (right click) for folders
  contextMenuVisible = false;
  contextMenuStyle: { top: string; left: string } = { top: '0px', left: '0px' };
  contextMenuNode: any = null;

  onFolderContextMenu(event: MouseEvent, node: any): void {
    event.preventDefault();
    this.contextMenuNode = node;
    const x = event.clientX;
    const y = event.clientY;
    this.contextMenuStyle = { top: y + 'px', left: x + 'px' };
    this.contextMenuVisible = true;
  }

  hideContextMenu(): void {
    this.contextMenuVisible = false;
    this.contextMenuNode = null;
  }

  actionNewFolder(): void {
    if (!this.contextMenuNode) return;
    const nombre = prompt('Nombre de carpeta:');
    if (!nombre) return;
    this.catalogoService.crearCarpeta(nombre, this.contextMenuNode.id, this.filtros.area_id || null)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.toggleNode(this.contextMenuNode); this.toggleNode(this.contextMenuNode); this.hideContextMenu(); });
  }

  actionRenameFolder(): void {
    if (!this.contextMenuNode) return;
    const nuevo = prompt('Nuevo nombre:', this.contextMenuNode.nombre);
    if (!nuevo) return;
    this.catalogoService.renombrarCarpeta(this.contextMenuNode.id, nuevo)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.contextMenuNode.nombre = nuevo; this.hideContextMenu(); });
  }

  actionDeleteFolder(): void {
    if (!this.contextMenuNode) return;
    if (!confirm('¿Eliminar carpeta (se desactivará)?')) return;
    this.catalogoService.eliminarCarpeta(this.contextMenuNode.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.loadSidebarFolders(); this.loadFolderContent(); this.hideContextMenu(); });
  }

  actionMoveHere(): void {
    if (!this.contextMenuNode) { return; }
    const targetCarpetaId = this.contextMenuNode.id;
    const toMove = this.clipboardDocs.length ? this.clipboardDocs : (this.moveTarget ? [this.moveTarget.id] : []);
    if (!toMove.length) { alert('No hay documentos seleccionados para mover.'); return; }
    const moves = toMove.map(id => this.documentoService.mover(id, targetCarpetaId).pipe(takeUntil(this.destroy$)));
    // Ejecutar en serie para simplicidad
    let done = 0;
    moves.forEach(obs => obs.subscribe({
      next: () => { done++; if (done === moves.length) { this.loadDocumentos(); this.hideContextMenu(); this.clipboardDocs = []; this.selection = {}; } },
      error: () => { done++; if (done === moves.length) { this.loadDocumentos(); this.hideContextMenu(); this.clipboardDocs = []; this.selection = {}; } }
    }));
  }

  loadDocumentos(): void {
    this.loading = true;

    const filtrosConCarpeta: any = { ...this.filtros };
    // Para raíz, enviar null (no 'root') para evitar errores de API
    filtrosConCarpeta.carpeta_id = this.currentFolderId ?? null;

    this.documentoService.listar(filtrosConCarpeta)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.documentos = response.data.data;
            this.paginacion = {
              currentPage: response.data.current_page,
              lastPage: response.data.last_page,
              total: response.data.total,
              perPage: response.data.per_page,
              from: response.data.from,
              to: response.data.to
            };
            this.calculateStats();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading documentos:', error);
          this.loading = false;
        }
      });
  }

  loadCompartidosConmigo(): void {
    this.loading = true;

    this.documentoService.listarCompartidosConmigo(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.compartidosConmigo = response.data.data;
            console.log('📥 Compartidos conmigo cargados:', this.compartidosConmigo.length);
            console.log('📋 Primer registro:', this.compartidosConmigo[0]);
            this.paginacion = {
              currentPage: response.data.current_page,
              lastPage: response.data.last_page,
              total: response.data.total,
              perPage: response.data.per_page,
              from: response.data.from,
              to: response.data.to
            };
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading compartidos:', error);
          this.loading = false;
        }
      });
  }

  calculateStats(): void {
    const docs = this.documentos;
    const total = this.paginacion.total;
    const firmados = docs.filter(d => d.firmado).length;
    const bloqueados = docs.filter(d => d.bloqueado).length;
    const pendientes = docs.filter(d => d.estado === 'borrador' || d.estado === 'revision').length;

    const porTipoMap = new Map<string, number>();
    const porClasifMap = new Map<string, number>();
    const porAreaMap = new Map<string, number>();
    for (const d of docs) {
      const tipo = d.tipo_documento?.nombre || 'Sin tipo';
      porTipoMap.set(tipo, (porTipoMap.get(tipo) || 0) + 1);
      porClasifMap.set(d.clasificacion, (porClasifMap.get(d.clasificacion) || 0) + 1);
      const area = d.area?.nombre || 'Sin área';
      porAreaMap.set(area, (porAreaMap.get(area) || 0) + 1);
    }

    this.stats = {
      total,
      firmados,
      bloqueados,
      pendientes,
      porTipo: Array.from(porTipoMap, ([nombre, total]) => ({ nombre, total })).sort((a,b)=>b.total-a.total).slice(0,5),
      porClasificacion: Array.from(porClasifMap, ([nombre, total]) => ({ nombre, total })),
      porArea: Array.from(porAreaMap, ([nombre, total]) => ({ nombre, total })).sort((a,b)=>b.total-a.total).slice(0,5)
    };
  }

  onFilterChange(): void {
    this.filtros.page = 1;
    this.loadDocumentos();
  }

  onPageChange(page: number): void {
    this.filtros.page = page;
    if (this.activeTab === 'compartidos') {
      this.loadCompartidosConmigo();
    } else {
      this.loadDocumentos();
    }
  }

  onPageSizeChange(): void {
    this.filtros.per_page = this.dt.pageSize;
    this.filtros.page = 1;
    if (this.activeTab === 'compartidos') {
      this.loadCompartidosConmigo();
    } else {
      this.loadDocumentos();
    }
  }

  onSearchChange(): void {
    this.filtros.q = this.dt.search;
    this.filtros.page = 1;
    if (this.activeTab === 'compartidos') {
      this.loadCompartidosConmigo();
    } else {
    this.loadDocumentos();
    }
  }

  toggleSelectAll(checked: boolean): void {
    this.documentos.forEach(d => this.toggleSelect(d.id, checked));
  }

  clearFilters(): void {
    this.filtros = {
      per_page: 15,
      page: 1
    };
    this.loadDocumentos();
  }

  descargarDocumento(documento: Documento): void {
    this.documentoService.descargar(documento.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = documento.nombre_archivo;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        error: (error) => {
          console.error('Error descargando documento:', error);
          alert('Error al descargar el documento');
        }
      });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'borrador': 'badge-secondary',
      'revision': 'badge-warning',
      'aprobado': 'badge-success',
      'archivado': 'badge-info',
      'eliminado': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  getClasificacionBadgeClass(clasificacion: string): string {
    const classes: { [key: string]: string } = {
      'publico': 'badge-success',
      'reservado': 'badge-warning',
      'confidencial': 'badge-danger',
      'secreto': 'badge-dark'
    };
    return classes[clasificacion] || 'badge-secondary';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  onRefresh(): void {
    this.loadDocumentos();
  }

  getFileIcon(extension: string): string {
    const ext = (extension || '').toLowerCase();
    const map: { [key: string]: string } = {
      'pdf': 'fas fa-file-pdf text-danger',
      'doc': 'fas fa-file-word text-primary',
      'docx': 'fas fa-file-word text-primary',
      'xls': 'fas fa-file-excel text-success',
      'xlsx': 'fas fa-file-excel text-success',
      'csv': 'fas fa-file-csv text-success',
      'ppt': 'fas fa-file-powerpoint text-warning',
      'pptx': 'fas fa-file-powerpoint text-warning',
      'jpg': 'fas fa-file-image text-primary',
      'jpeg': 'fas fa-file-image text-primary',
      'png': 'fas fa-file-image text-primary',
      'gif': 'fas fa-file-image text-primary',
      'tiff': 'fas fa-file-image text-primary',
      'tif': 'fas fa-file-image text-primary',
      'txt': 'fas fa-file-alt text-muted',
      'zip': 'fas fa-file-archive text-muted',
      'rar': 'fas fa-file-archive text-muted'
    };
    return map[ext] || 'fas fa-file text-muted';
  }

  // Donut chart helpers for Clasificación
  private clasifColors: { [key: string]: string } = {
    'publico': '#28a745',
    'reservado': '#ffc107',
    'confidencial': '#dc3545',
    'secreto': '#343a40'
  };

  getClasifLegend(): Array<{ nombre: string; total: number; color: string; percent: number }> {
    const total = this.stats.total || 1;
    return (this.stats.porClasificacion || []).map(item => ({
      nombre: item.nombre,
      total: item.total,
      color: this.clasifColors[item.nombre] || '#6c757d',
      percent: Math.round((item.total / total) * 100)
    }));
  }

  getClasifDonutBackground(): string {
    const segments = this.getClasifLegend();
    if (!segments.length || this.stats.total === 0) {
      return '#e9ecef';
    }
    let current = 0;
    const parts: string[] = [];
    for (const s of segments) {
      const next = current + s.percent;
      parts.push(`${s.color} ${current}% ${next}%`);
      current = next;
    }
    if (current < 100) {
      parts.push(`#e9ecef ${current}% 100%`);
    }
    return `conic-gradient(${parts.join(', ')})`;
  }

  // Export CSV of current list
  exportCsv(): void {
    const headers = ['id','codigo','titulo','tipo','area','carpeta_id','propietario_id','estado','clasificacion','fecha_documento','tamano_bytes','extension'];
    const rows = this.documentos.map(d => ([
      d.id,
      d.codigo,
      (d.titulo || '').replace(/\"/g,'\"'),
      d.tipo_documento?.nombre || '',
      d.area?.nombre || '',
      d.carpeta_id || '',
      d.propietario_id || d.creado_por_id || '',
      d.estado,
      d.clasificacion,
      d.fecha_documento,
      d.tamano_bytes,
      d.extension
    ]));
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g,'""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documentos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

