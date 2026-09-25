import { environment } from '../../../../environments/environment';

/**
 * Convierte una ruta de storage (ej: banners/imagenes/xxx.png) a URL para el backend.
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return '';
  
  let cleanPath = String(path);
  
  // Si ya es una URL absoluta, la devolvemos tal cual
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // Quitamos prefijos redundantes
  const clean = cleanPath.replace(/^\//, '').replace(/^storage\//, '').replace(/^media\//, '');
  
  // Construimos la URL usando la base de la API configurada en el entorno
  // environment.apiUrl ya termina en /api
  return `${environment.apiUrl}/media/${clean}`;
}
