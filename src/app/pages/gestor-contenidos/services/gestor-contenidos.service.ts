import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GestorContenidosService {
  private apiUrl = `${environment.apiUrl}/gestor-contenidos`;

  constructor(private http: HttpClient) {}

  getMediaUrl(): string {
    // Retorna la base del backend (sin /api) + /media
    return `${environment.apiUrl.replace(/\/api$/, '')}/media`;
  }

  private buildParams(filtros: any): HttpParams {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return params;
  }

  getDashboard(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/dashboard`); }

  // Páginas
  getPaginas(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/paginas`, { params: this.buildParams(filtros) }); }
  getPagina(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/paginas/${id}`); }
  crearPagina(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/paginas`, datos); }
  actualizarPagina(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/paginas/${id}`, datos); }
  eliminarPagina(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/paginas/${id}`); }

  // Menús
  getMenus(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/menus`); }
  getMenu(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/menus/${id}`); }
  crearMenu(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/menus`, datos); }
  actualizarMenu(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/menus/${id}`, datos); }
  eliminarMenu(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/menus/${id}`); }
  reorderMenus(items: any[]): Observable<any> { return this.http.post<any>(`${this.apiUrl}/menus/reorder`, { items }); }
  getBuilderData(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/menus/builder/data`); }
  toggleMenu(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/menus/${id}/toggle`, {}); }
  guardarOrdenMenus(ubicacion: string, orden: any[]): Observable<any> { return this.http.post<any>(`${this.apiUrl}/menus/reorder`, { ubicacion, orden: JSON.stringify(orden) }); }

  // Banners
  getBanners(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/banners`); }
  getBanner(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/banners/${id}`); }
  crearBanner(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/banners`, datos); }
  actualizarBanner(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/banners/${id}`, datos); }
  eliminarBanner(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/banners/${id}`); }

  // Configuración
  getConfiguracion(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/configuracion`); }
  crearConfiguracion(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/configuracion`, datos); }
  actualizarConfiguracion(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/configuracion/${id}`, datos); }
  eliminarConfiguracion(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/configuracion/${id}`); }
  actualizarConfiguracionPorClave(clave: string, valor: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/configuracion/by-clave`, { clave, valor }); }
  guardarTodasConfiguracion(formData: FormData): Observable<any> { return this.http.post<any>(`${this.apiUrl}/configuracion/guardar-todas`, formData); }

  // Temas
  getTemas(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/temas`); }
  getTema(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/temas/${id}`); }
  crearTema(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/temas`, datos); }
  actualizarTema(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/temas/${id}`, datos); }
  eliminarTema(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/temas/${id}`); }
  setPredeterminado(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/temas/${id}/set-predeterminado`, {}); }

  // Plantillas
  getPlantillas(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/plantillas`); }
  getPlantilla(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/plantillas/${id}`); }
  crearPlantilla(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/plantillas`, datos); }
  actualizarPlantilla(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/plantillas/${id}`, datos); }
  eliminarPlantilla(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/plantillas/${id}`); }
  duplicarPlantilla(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/plantillas/${id}/duplicate`, {}); }
  getComponentesDisponibles(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/plantillas/componentes-disponibles`); }

  // Noticias
  getNoticias(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/noticias`, { params: this.buildParams(filtros) }); }
  getNoticia(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/noticias/${id}`); }
  crearNoticia(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/noticias`, datos); }
  actualizarNoticia(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/noticias/${id}`, datos); }
  actualizarNoticiaConArchivos(id: number, formData: FormData): Observable<any> { return this.http.post<any>(`${this.apiUrl}/noticias/${id}`, formData); }
  eliminarNoticia(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/noticias/${id}`); }

  // Proyectos
  getProyectos(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/proyectos`, { params: this.buildParams(filtros) }); }
  getProyecto(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/proyectos/${id}`); }
  crearProyecto(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/proyectos`, datos); }
  actualizarProyecto(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/proyectos/${id}`, datos); }
  eliminarProyecto(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/proyectos/${id}`); }

  // Testimonios
  getTestimonios(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/testimonios`); }
  getTestimonio(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/testimonios/${id}`); }
  crearTestimonio(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/testimonios`, datos); }
  actualizarTestimonio(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/testimonios/${id}`, datos); }
  eliminarTestimonio(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/testimonios/${id}`); }

  // CTAs
  getCtas(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/ctas`); }
  getCta(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/ctas/${id}`); }
  crearCta(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/ctas`, datos); }
  actualizarCta(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/ctas/${id}`, datos); }
  eliminarCta(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/ctas/${id}`); }

  // Citas
  getCitas(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/citas`, { params: this.buildParams(filtros) }); }
  getCita(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/citas/${id}`); }
  crearCita(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/citas`, datos); }
  actualizarCita(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/citas/${id}`, datos); }
  eliminarCita(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/citas/${id}`); }
  enviarEmailCita(id: number, datos: { asunto: string; mensaje: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas/${id}/enviar-email`, datos);
  }

  // Accesos Directos
  getAccesosDirectos(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/accesos-directos`); }
  getAccesoDirecto(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/accesos-directos/${id}`); }
  crearAccesoDirecto(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/accesos-directos`, datos); }
  actualizarAccesoDirecto(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/accesos-directos/${id}`, datos); }
  eliminarAccesoDirecto(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/accesos-directos/${id}`); }
  reorderAccesosDirectos(items: any[]): Observable<any> { return this.http.post<any>(`${this.apiUrl}/accesos-directos/reorder`, { items }); }
  reorderAccesosDirectosSortable(orden: number[]): Observable<any> { return this.http.post<any>(`${this.apiUrl}/accesos-directos/reorder`, { orden }); }

  // Fotos Aniversario
  getFotosAniversario(params?: { page?: number; per_page?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', String(params.page));
    if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
    return this.http.get<any>(`${this.apiUrl}/fotos-aniversario`, { params: httpParams });
  }
  getFotoAniversario(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/fotos-aniversario/${id}`); }
  crearFotoAniversario(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/fotos-aniversario`, datos); }
  actualizarFotoAniversario(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/fotos-aniversario/${id}`, datos); }
  eliminarFotoAniversario(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/fotos-aniversario/${id}`); }
  toggleFotoAniversario(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/fotos-aniversario/${id}/toggle`, {}); }
  getConfiguracionModalAniversario(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/fotos-aniversario/configurar/modal`); }
  guardarConfiguracionModalAniversario(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/fotos-aniversario/configurar/modal`, datos); }

  // Eventos
  getEventos(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/eventos`); }
  getEvento(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/eventos/${id}`); }
  crearEvento(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/eventos`, datos); }
  actualizarEvento(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/eventos/${id}`, datos); }
  eliminarEvento(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/eventos/${id}`); }

  // Contactos
  getContactos(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/contactos`); }
  getContacto(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/contactos/${id}`); }
  eliminarContacto(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/contactos/${id}`); }
  responderContacto(id: number, respuesta: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contactos/${id}/responder`, { respuesta }); }
  marcarContactoPendiente(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/contactos/${id}/pendiente`, {}); }

  // Ofertas Empleo
  getOfertasEmpleo(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/ofertas-empleo`); }
  getOfertaEmpleo(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/ofertas-empleo/${id}`); }
  crearOfertaEmpleo(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/ofertas-empleo`, datos); }
  actualizarOfertaEmpleo(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/ofertas-empleo/${id}`, datos); }
  actualizarOfertaConArchivos(id: number, formData: FormData): Observable<any> { 
    return this.http.post<any>(`${this.apiUrl}/ofertas-empleo/${id}`, formData); 
  }
  eliminarOfertaEmpleo(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/ofertas-empleo/${id}`); }

  // Postulaciones
  getPostulaciones(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/postulaciones`, { params: this.buildParams(filtros) }); }
  getPostulacion(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/postulaciones/${id}`); }
  actualizarPostulacion(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/postulaciones/${id}`, datos); }
  eliminarPostulacion(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/postulaciones/${id}`); }

  // Servicios
  getServicios(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/servicios`); }
  getServicio(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/servicios/${id}`); }
  crearServicio(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/servicios`, datos); }
  actualizarServicio(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/servicios/${id}`, datos); }
  eliminarServicio(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/servicios/${id}`); }

  // Documentos
  getDocumentos(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/documentos`); }
  getDocumento(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/documentos/${id}`); }
  crearDocumento(datos: FormData): Observable<any> { return this.http.post<any>(`${this.apiUrl}/documentos`, datos); }
  actualizarDocumento(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/documentos/${id}`, datos); }
  eliminarDocumento(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/documentos/${id}`); }
  descargarDocumento(id: number): string { return `${this.apiUrl}/documentos/${id}/descargar`; }

  // Componentes reutilizables
  getComponentesReutilizables(incluirInactivos = false): Observable<any> {
    let params = new HttpParams();
    if (incluirInactivos) params = params.set('incluir_inactivos', '1');
    return this.http.get<any>(`${this.apiUrl}/componentes-reutilizables`, { params });
  }
  getComponenteReutilizable(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/componentes-reutilizables/${id}`); }
  crearComponenteReutilizable(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/componentes-reutilizables`, datos); }
  actualizarComponenteReutilizable(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/componentes-reutilizables/${id}`, datos); }
  eliminarComponenteReutilizable(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/componentes-reutilizables/${id}`); }

  // Categorías
  getCategorias(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/categorias`); }
  getCategoria(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/categorias/${id}`); }
  crearCategoria(datos: any): Observable<any> { return this.http.post<any>(`${this.apiUrl}/categorias`, datos); }
  actualizarCategoria(id: number, datos: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/categorias/${id}`, datos); }
  eliminarCategoria(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/categorias/${id}`); }

  // Miembros del Colegio
  getMiembros(filtros?: any): Observable<any> { return this.http.get<any>(`${this.apiUrl}/miembros`, { params: this.buildParams(filtros) }); }
  getMiembro(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/miembros/${id}`); }
  crearMiembro(formData: FormData): Observable<any> { return this.http.post<any>(`${this.apiUrl}/miembros`, formData); }
  actualizarMiembro(id: number, formData: FormData): Observable<any> { 
    // Usamos POST con method spoofing para manejar archivos en actualizaciones
    formData.append('_method', 'PUT');
    return this.http.post<any>(`${this.apiUrl}/miembros/${id}`, formData); 
  }

  eliminarFotoMiembro(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/miembros/${id}/eliminar-foto`, {});
  }

  eliminarMiembro(id: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/miembros/${id}`); }

  // Upload
  uploadImagen(archivo: File, carpeta?: string): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', archivo);
    if (carpeta) formData.append('carpeta', carpeta);
    return this.http.post<any>(`${this.apiUrl}/upload/imagen`, formData);
  }
}

