# Guía del Frontend - Sistema de Mensajería

## Descripción General

El frontend del sistema de mensajería está desarrollado en Angular 19 y proporciona una interfaz moderna y responsiva para la comunicación interna Notaria.

## Arquitectura del Frontend

### Estructura de Módulos

```
src/app/pages/mensajeria/
├── components/                    # Componentes reutilizables
│   ├── message-list/             # Lista de mensajes con DataTables
│   ├── message-compose/          # Formulario de composición
│   ├── message-detail/           # Vista detallada de mensajes
│   ├── conversation-list/        # Lista de conversaciones
│   ├── folder-list/              # Gestión de carpetas
│   ├── advanced-search/          # Búsqueda avanzada
│   ├── template-manager/         # Gestión de plantillas
│   ├── attachment-manager/       # Gestión de adjuntos
│   └── navbar-integration/       # Integración con navbar
├── services/                     # Servicios de datos
│   ├── message.service.ts        # API de mensajes
│   ├── folder.service.ts         # API de carpetas
│   ├── template.service.ts       # API de plantillas
│   ├── attachment.service.ts     # API de adjuntos
│   ├── notification.service.ts   # Notificaciones
│   ├── websocket.service.ts      # WebSocket/Pusher
│   ├── cache.service.ts          # Sistema de caché
│   ├── performance.service.ts    # Optimización
│   └── menu-integration.service.ts # Integración menú
├── models/                       # Interfaces TypeScript
│   ├── message.model.ts
│   ├── conversation.model.ts
│   ├── attachment.model.ts
│   ├── recipient.model.ts
│   └── notification.model.ts
├── mensajeria-main.component.*   # Componente principal
├── mensajeria-routing.module.ts  # Rutas del módulo
└── mensajeria.module.ts          # Configuración del módulo
```

## Componentes Principales

### 1. MessageListComponent

**Propósito**: Mostrar lista de mensajes con funcionalidades avanzadas

**Características**:
- Integración con DataTables para paginación y filtros
- Acciones masivas (marcar como leído, eliminar)
- Indicadores visuales para mensajes no leídos
- Búsqueda en tiempo real

**Uso**:
```html
<app-message-list 
  [folder]="currentFolder"
  [showActions]="true"
  (messageSelected)="onMessageSelected($event)"
  (messagesChanged)="onMessagesChanged($event)">
</app-message-list>
```

### 2. MessageComposeComponent

**Propósito**: Formulario para redactar mensajes

**Características**:
- Selector de destinatarios con autocompletado
- Drag & drop para adjuntos
- Validación en tiempo real
- Soporte para plantillas
- Guardado automático de borradores

**Uso**:
```html
<app-message-compose
  [replyToMessage]="replyMessage"
  [initialRecipients]="recipients"
  (messageSent)="onMessageSent($event)"
  (cancel)="onCancel()">
</app-message-compose>
```

### 3. MessageDetailComponent

**Propósito**: Vista detallada de un mensaje

**Características**:
- Visualización completa del mensaje
- Gestión de adjuntos con preview
- Acciones (responder, reenviar, eliminar)
- Navegación entre mensajes
- Indicadores de estado de lectura

**Uso**:
```html
<app-message-detail
  [messageId]="selectedMessageId"
  [showNavigation]="true"
  (reply)="onReply($event)"
  (forward)="onForward($event)">
</app-message-detail>
```

### 4. AdvancedSearchComponent

**Propósito**: Búsqueda avanzada con filtros múltiples

**Características**:
- Filtros por campo, operador y valor
- Guardado de búsquedas frecuentes
- Rango de fechas
- Opciones de ordenamiento

**Uso**:
```html
<app-advanced-search
  [initialQuery]="searchQuery"
  (searchExecuted)="onSearchExecuted($event)"
  (searchSaved)="onSearchSaved($event)">
</app-advanced-search>
```

### 5. TemplateManagerComponent

**Propósito**: Gestión de plantillas de mensajes

**Características**:
- CRUD completo de plantillas
- Sistema de variables dinámicas
- Categorización y etiquetado
- Vista previa antes de aplicar

**Uso**:
```html
<app-template-manager
  [mode]="'select'"
  [category]="'personal'"
  (templateSelected)="onTemplateSelected($event)">
</app-template-manager>
```

### 6. AttachmentManagerComponent

**Propósito**: Gestión completa de archivos adjuntos

**Características**:
- Drag & drop intuitivo
- Compresión automática de imágenes
- Preview de archivos
- Validación de tipos y tamaños
- Descarga segura

**Uso**:
```html
<app-attachment-manager
  [(attachments)]="messageAttachments"
  [readonly]="false"
  [maxFiles]="5"
  (fileAdded)="onFileAdded($event)">
</app-attachment-manager>
```

## Servicios

### MessageService

**Propósito**: Comunicación con la API de mensajes

**Métodos principales**:
```typescript
// Obtener mensajes
getMessages(params?: any): Observable<MessageResponse>

// Enviar mensaje
sendMessage(messageData: SendMessageRequest): Observable<ApiResponse<Message>>

// Marcar como leído
markAsRead(messageId: number): Observable<ApiResponse<void>>

// Búsqueda
searchMessages(params: any): Observable<ApiResponse<any>>
```

### CacheService

**Propósito**: Sistema de caché para optimizar rendimiento

**Características**:
- Caché en memoria con TTL
- Invalidación por patrones
- Métricas de rendimiento
- Limpieza automática

**Uso**:
```typescript
// Obtener con caché
this.cacheService.get('messages:inbox', () => 
  this.http.get('/api/messages'), 
  5 * 60 * 1000 // 5 minutos
);

// Invalidar caché
this.cacheService.invalidateMessages();
```

### WebSocketService

**Propósito**: Comunicación en tiempo real

**Características**:
- Conexión automática con Pusher
- Reconexión automática
- Eventos tipados
- Gestión de estado de conexión

**Uso**:
```typescript
// Escuchar mensajes nuevos
this.webSocketService.onMessageReceived()
  .subscribe(message => {
    this.handleNewMessage(message);
  });
```

### PerformanceService

**Propósito**: Optimización y monitoreo de rendimiento

**Características**:
- Lazy loading automático
- Optimización de imágenes
- Métricas de rendimiento
- Virtual scrolling

**Uso**:
```typescript
// Optimizar imagen
const optimizedFile = await this.performanceService
  .optimizeImage(file, 1920, 1080, 0.8);

// Observar elemento para lazy loading
this.performanceService.observeLazyElement(element);
```

## Modelos de Datos

### Message

```typescript
interface Message {
  id: number;
  subject?: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  sender: User;
  recipients: Recipient[];
  attachments?: Attachment[];
  is_read: boolean;
  is_important: boolean;
  created_at: string;
  conversation_id?: number;
}
```

### Recipient

```typescript
interface Recipient {
  id: number;
  type: 'user' | 'department';
  name: string;
  email?: string;
  department?: string;
  user_count?: number; // Para departamentos
}
```

### Attachment

```typescript
interface Attachment {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  preview_url?: string;
}
```

## Integración con AdminLTE

### Navbar Integration

El componente `NavbarIntegrationComponent` se integra con la barra de navegación:

```html
<!-- En app.component.html -->
<li class="nav-item">
  <app-mensajeria-navbar 
    [showQuickCompose]="true"
    [showNotificationDropdown]="true">
  </app-mensajeria-navbar>
</li>
```

### Menu Integration

El servicio `MenuIntegrationService` proporciona elementos de menú dinámicos:

```typescript
// Obtener elementos de menú
const menuItems = this.menuIntegrationService.getMenuItems();

// Obtener contador de no leídos
const unreadCount = this.menuIntegrationService.getUnreadCount();
```

## Optimización de Rendimiento

### Lazy Loading

Los componentes implementan lazy loading automático:

```typescript
// En el componente
ngAfterViewInit() {
  this.performanceService.observeLazyElement(this.elementRef.nativeElement);
}
```

### Virtual Scrolling

Para listas grandes, usar virtual scrolling:

```html
<cdk-virtual-scroll-viewport itemSize="50" class="message-viewport">
  <div *cdkVirtualFor="let message of messages">
    <!-- Contenido del mensaje -->
  </div>
</cdk-virtual-scroll-viewport>
```

### Caché Inteligente

Los servicios implementan caché automático:

```typescript
// Los datos se cachean automáticamente
this.messageService.getMessages().subscribe(messages => {
  // Los datos vienen del caché si están disponibles
});
```

## Responsive Design

### Breakpoints

El sistema usa los breakpoints estándar de Bootstrap:

- **xs**: < 576px (móviles)
- **sm**: ≥ 576px (móviles grandes)
- **md**: ≥ 768px (tablets)
- **lg**: ≥ 992px (desktops)
- **xl**: ≥ 1200px (desktops grandes)

### Adaptaciones Móviles

```scss
@media (max-width: 768px) {
  .message-list {
    .message-item {
      padding: 0.5rem;
      
      .message-actions {
        opacity: 1; // Siempre visible en móvil
      }
    }
  }
}
```

## Testing

### Unit Tests

```bash
# Ejecutar tests del módulo
ng test --include="**/mensajeria/**/*.spec.ts"
```

### E2E Tests

```bash
# Tests end-to-end
ng e2e --suite=mensajeria
```

### Ejemplo de Test

```typescript
describe('MessageListComponent', () => {
  let component: MessageListComponent;
  let fixture: ComponentFixture<MessageListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MessageListComponent],
      imports: [HttpClientTestingModule]
    });
  });

  it('should load messages on init', () => {
    component.ngOnInit();
    expect(component.messages.length).toBeGreaterThan(0);
  });
});
```

## Deployment

### Build de Producción

```bash
# Build optimizado
ng build --configuration production

# Análisis de bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### Configuración de Entorno

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.Notaria.com',
  pusherKey: 'your-pusher-key',
  pusherCluster: 'your-cluster'
};
```

## Troubleshooting

### Problemas Comunes

#### 1. Componentes no se cargan

**Solución**: Verificar que el módulo esté importado correctamente:

```typescript
// En app.module.ts o el módulo padre
imports: [
  MensajeriaModule
]
```

#### 2. WebSocket no conecta

**Solución**: Verificar configuración de Pusher:

```typescript
// Verificar en browser console
console.log('Pusher config:', environment.pusherKey);
```

#### 3. Caché no funciona

**Solución**: Verificar que el servicio esté inyectado:

```typescript
constructor(
  private cacheService: CacheService
) {}
```

### Debug Mode

Activar modo debug en desarrollo:

```typescript
// En environment.ts
export const environment = {
  production: false,
  debug: true,
  // ...
};
```

## Mejores Prácticas

### 1. Gestión de Estado

- Usar servicios para estado compartido
- Implementar patrón Observable
- Evitar estado en componentes padre-hijo

### 2. Performance

- Implementar OnPush change detection
- Usar trackBy en *ngFor
- Lazy load de imágenes y componentes

### 3. Accesibilidad

- Usar ARIA labels apropiados
- Implementar navegación por teclado
- Contraste de colores adecuado

### 4. Seguridad

- Sanitizar contenido HTML
- Validar archivos adjuntos
- Implementar CSP headers

## Extensibilidad

### Agregar Nuevo Componente

1. **Generar componente**:
```bash
ng generate component pages/mensajeria/components/mi-componente
```

2. **Registrar en módulo**:
```typescript
// En mensajeria.module.ts
declarations: [
  // ...
  MiComponenteComponent
]
```

3. **Agregar rutas si es necesario**:
```typescript
// En mensajeria-routing.module.ts
{
  path: 'mi-ruta',
  component: MiComponenteComponent
}
```

### Agregar Nuevo Servicio

1. **Generar servicio**:
```bash
ng generate service pages/mensajeria/services/mi-servicio
```

2. **Registrar en módulo**:
```typescript
// En mensajeria.module.ts
providers: [
  // ...
  MiServicioService
]
```

---

Esta guía proporciona una visión completa del frontend del sistema de mensajería. Para más detalles específicos, consultar el código fuente y los comentarios en línea.