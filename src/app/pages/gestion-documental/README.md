# Módulo de Gestión Documental

Sistema de Gestión y Digitalización de Documentos (SGDD) para la Notaria Provincial de Jorge Basadre.

## 📁 Estructura del Módulo

```
gestion-documental/
├── models/
│   └── documento.model.ts        # Interfaces y tipos TypeScript
├── services/
│   ├── documento.service.ts      # API de documentos
│   ├── cierre.service.ts         # API de cierres
│   ├── auditoria.service.ts      # API de auditoría
│   └── catalogo.service.ts       # Catálogos (áreas, tipos)
├── lista/
│   ├── lista-documentos.component.ts    # Bandeja de documentos
│   ├── lista-documentos.component.html
│   └── lista-documentos.component.scss
├── cargar/
│   ├── cargar-documento.component.ts    # Formulario de carga
│   ├── cargar-documento.component.html
│   └── cargar-documento.component.scss
├── cierres/
│   ├── cierres.component.ts      # Archivo central
│   ├── cierres.component.html
│   └── cierres.component.scss
├── reportes/
│   ├── reportes.component.ts     # Reportes y auditoría
│   ├── reportes.component.html
│   └── reportes.component.scss
└── gestion-documental.routes.ts  # Configuración de rutas
```

## 🎯 Características

### 1. Bandeja de Documentos
- Listado paginado de documentos
- Filtros avanzados (área, tipo, estado, clasificación, fechas)
- Descarga de documentos
- Indicadores de estado (firmado, bloqueado)
- Stats cards con métricas

### 2. Carga de Documentos
- Formulario de digitalización
- Validación de archivos (PDF, JPG, PNG, TIFF)
- Control de tamaño máximo (20MB)
- Metadatos documentales
- Preview de archivo

### 3. Archivo Central (Cierres)
- Creación de cierres por periodo (mensual, trimestral, anual)
- Aprobación/rechazo de cierres
- Bloqueo automático de documentos
- Generación de hash consolidado

### 4. Reportes y Auditoría
- Estadísticas de accesos y modificaciones
- Historial de acciones por documento
- Filtros por fecha y usuario
- Exportación de reportes

## 🔐 Permisos Requeridos

| Permiso | Descripción |
|---------|-------------|
| `gestion-documental.view` | Ver documentos |
| `gestion-documental.list` | Listar documentos |
| `gestion-documental.create` | Crear documentos |
| `gestion-documental.edit` | Editar documentos |
| `gestion-documental.delete` | Eliminar documentos |
| `gestion-documental.close` | Gestionar cierres |
| `gestion-documental.audit` | Ver auditoría |
| `gestion-documental.sign` | Firmar digitalmente |

## 📋 API Endpoints

**Base URL:** `/api/gestion-documental`

### Documentos
- `GET /documentos` - Listar documentos
- `POST /documentos` - Crear documento
- `GET /documentos/{id}` - Obtener documento
- `PUT /documentos/{id}` - Actualizar documento
- `DELETE /documentos/{id}` - Eliminar documento
- `GET /documentos/{id}/descargar` - Descargar archivo
- `POST /documentos/{id}/derivar` - Derivar documento

### Versiones
- `GET /documentos/{id}/versiones` - Listar versiones
- `POST /documentos/{id}/versiones` - Nueva versión

### Firma Digital
- `POST /documentos/{id}/firma` - Firmar documento
- `POST /documentos/{id}/firma/verificar` - Verificar firma

### Cierres
- `GET /cierres` - Listar cierres
- `POST /cierres` - Crear cierre
- `GET /cierres/{id}` - Detalle cierre
- `PUT /cierres/{id}/aprobar` - Aprobar cierre
- `PUT /cierres/{id}/rechazar` - Rechazar cierre

### Auditoría
- `GET /auditoria/accesos` - Auditoría de accesos
- `GET /auditoria/modificaciones` - Auditoría de modificaciones
- `GET /auditoria/documentos/{id}` - Historial de documento
- `GET /auditoria/reportes/estadisticas` - Estadísticas

### Catálogos
- `GET /catalogo/areas` - Listar áreas activas
- `GET /catalogo/tipos-documento` - Listar tipos de documento
- `GET /catalogo/clasificaciones` - Obtener clasificaciones disponibles
- `GET /catalogo/estados` - Obtener estados de documento
- `GET /catalogo/prioridades` - Obtener prioridades de derivación
- `GET /catalogo/tipos-periodo` - Obtener tipos de periodo para cierres

## 🚀 Uso

### 1. Registrar Rutas en `app.routes.ts`

```typescript
import { GESTION_DOCUMENTAL_ROUTES } from './pages/gestion-documental/gestion-documental.routes';

export const routes: Routes = [
  // ... otras rutas
  ...GESTION_DOCUMENTAL_ROUTES,
];
```

### 2. Acceder al Módulo

Las rutas disponibles son:
- `/gestion-documental/lista` - Bandeja de documentos
- `/gestion-documental/cargar` - Cargar documento
- `/gestion-documental/cierres` - Archivo central
- `/gestion-documental/reportes` - Reportes

### 3. Menú de Navegación

El backend expone la configuración del menú en:
`backend/Modules/GestionDocumental/config/menu.php`

## 🛠️ Configuración

### Variables de Entorno (Backend)

```env
GESTION_DOCUMENTAL_DISK=nas
GESTION_DOCUMENTAL_PATH=documentos
GESTION_DOCUMENTAL_MAX_SIZE=20480
GESTION_DOCUMENTAL_OCR_ENABLED=false
GESTION_DOCUMENTAL_FIRMA_ENABLED=false
```

### Configuración Frontend

El endpoint base se configura en `environment.ts`:
```typescript
apiUrl: 'http://localhost:8000/api'
```

## 📊 Arquitectura

### Backend
- **Controllers**: Orquestación sin lógica de negocio
- **Services**: Lógica de negocio centralizada
- **Requests**: Validación de entrada
- **Models**: Eloquent ORM
- **Storage**: NAS/S3 con hashing SHA-256

### Frontend
- **Standalone Components**: Angular 18
- **Servicios Tipados**: HttpClient con interfaces
- **Lazy Loading**: Carga bajo demanda
- **Guards**: Auth + Permissions

## 🔒 Seguridad

- Autenticación: Laravel Sanctum
- Autorización: RBAC por permisos
- Cifrado: AES-256 at-rest, TLS 1.3 in-transit
- Hash: SHA-256 para integridad de archivos
- Auditoría: Registro de todas las acciones

## 📝 Normativa

- Ley 27806 (Transparencia y Acceso a la Información Pública)
- Ley 29733 (Protección de Datos Personales)
- Directiva 001-2020-AGN
- NTP 394.601

## 🎨 UI/UX

- AdminLTE 3 theme
- Bootstrap 4/5
- Font Awesome icons
- Responsive design
- Loading states
- Error handling

## 🧪 Desarrollo

### Componente de Ejemplo

```typescript
import { ListaDocumentosComponent } from './pages/gestion-documental/lista/lista-documentos.component';
```

### Servicio de Ejemplo

```typescript
import { DocumentoService } from './pages/gestion-documental/services/documento.service';

constructor(private documentoService: DocumentoService) {}

loadDocumentos() {
  this.documentoService.listar({ area_id: 1 })
    .subscribe(response => {
      this.documentos = response.data.data;
    });
}
```

## 📚 Futuras Mejoras

- [ ] OCR avanzado con IA
- [ ] Clasificación automática de documentos
- [ ] Integración con Mesa de Partes Virtual
- [ ] Control de préstamos de documentos físicos
- [ ] Firma digital con RENIEC
- [ ] Mobile app
- [ ] Búsqueda full-text mejorada

## 👥 Roles de Usuario

- **Administrador General**: Control total
- **Responsable de Archivo**: Valida y cierra expedientes
- **Digitalizador**: Escanea y registra documentos
- **Consultor**: Búsqueda y lectura
- **Auditor**: Consulta de auditorías

## 📞 Soporte

Oficina de TI - Notaria Provincial de Jorge Basadre
Email: ti@munibasadre.gob.pe

