# 💬 Chat Directo Funcional - Estilo Facebook Messenger

## 🎉 Descripción

Sistema de chat directo completamente funcional con diseño moderno inspirado en Facebook Messenger. Incluye lista de contactos, mensajería en tiempo real, adjuntos de archivos, emojis y más.

## ✨ Características Principales

### 📱 Interfaz de 3 Paneles

1. **Panel Izquierdo - Lista de Contactos**
   - Búsqueda de contactos en tiempo real
   - Indicadores de estado online/offline
   - Último mensaje y timestamp
   - Badges de mensajes no leídos
   - Avatares de usuarios

2. **Panel Central - Área de Chat**
   - Mensajes en tiempo real
   - Burbujas de chat estilo Messenger
   - Indicadores de entrega y lectura
   - Adjuntos de archivos e imágenes
   - Separadores de fecha
   - Indicador de "escribiendo..."

3. **Panel Derecho - Información del Chat** (opcional)
   - Información del contacto
   - Opciones de chat
   - Configuración

## 🚀 Funcionalidades

### ✉️ Mensajería

- **Envío de Mensajes**: Input con botón de envío o Enter
- **Mensajes de Texto**: Burbujas diferenciadas para enviados/recibidos
- **Archivos Adjuntos**: Subida de múltiples archivos
- **Emojis**: Selector de emojis completo
- **Timestamps**: Hora de envío en cada mensaje
- **Estados de Lectura**: Check simple y doble check

### 👥 Contactos

- **Lista Dinámica**: Carga desde el servicio o datos mock
- **Búsqueda**: Filtrado en tiempo real por nombre
- **Estado Online**: Indicador verde para usuarios activos
- **Selección**: Click para abrir/crear conversación
- **Último Mensaje**: Preview del último mensaje enviado

### 📎 Archivos

**Tipos Soportados:**
- Imágenes: JPEG, PNG, GIF, WEBP
- Documentos: PDF, Word, Excel
- Archivos: TXT, ZIP, RAR

**Límites:**
- Tamaño máximo: 10MB por archivo
- Múltiples archivos permitidos

### 😀 Emojis

- Selector con 100+ emojis
- Inserción con click
- Categorías variadas

### ⏱️ Tiempo Real

- **WebSocket**: Mensajes instantáneos
- **Polling**: Actualización cada 3 segundos
- **Indicador de Escritura**: Muestra cuando el otro usuario está escribiendo
- **Sonido**: Notificación de nuevo mensaje

## 📋 Uso

### Navegación

```
/mensajeria/chat
```

### Desde el Menú

Click en **CHAT > Directo** en el menú lateral

### Flujo de Uso

1. **Seleccionar Contacto**
   - Busca en la lista de la izquierda
   - Click en un contacto

2. **Ver/Crear Conversación**
   - Si existe una conversación, se carga
   - Si no existe, se crea automáticamente

3. **Enviar Mensaje**
   - Escribe en el input inferior
   - Presiona Enter o click en el botón enviar
   - Opcional: Adjunta archivos o emojis

4. **Recibir Mensajes**
   - Mensajes aparecen automáticamente
   - Scroll automático al fondo
   - Sonido de notificación

## 🎨 Diseño

### Paleta de Colores

**Modo Claro:**
- Primario: `#0084ff` (Azul Facebook)
- Fondo: `#f0f2f5` (Gris Claro)
- Burbujas Enviadas: `#0084ff` (Azul)
- Burbujas Recibidas: `#e4e6eb` (Gris)
- Texto: `#1c1e21` (Negro)
- Texto Secundario: `#65676b` (Gris Oscuro)

**Modo Oscuro:**
- Fondo: `#242526` (Gris Muy Oscuro)
- Burbujas: `#3a3b3c` (Gris Oscuro)
- Texto: `#e4e6eb` (Gris Muy Claro)

### Componentes de UI

- **Avatares**: Círculos de 48px con indicador online
- **Burbujas**: Border-radius de 18px
- **Inputs**: Fondo gris claro, border-radius 24px
- **Botones**: Circulares de 36px
- **Cards**: Border-radius 12px con sombra sutil

## 🔧 Implementación Técnica

### Archivos Principales

```
direct-chat.component.ts      - Lógica del componente
direct-chat.component.html    - Template HTML
direct-chat.component.scss    - Estilos modernos
```

### Servicios Utilizados

1. **MessageService**: CRUD de mensajes y conversaciones
2. **CustomEchoWebSocketService**: WebSocket para tiempo real
3. **AuthService**: Usuario actual
4. **Router/ActivatedRoute**: Navegación

### Modelos

```typescript
interface Contact {
  id: number;
  name: string;
  avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_online: boolean;
}

interface ChatMessage {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  sent_at: string;
  is_read: boolean;
  type: 'sent' | 'received';
  message_type?: 'text' | 'file' | 'image';
  attachments?: FileAttachment[];
}
```

### Métodos Principales

```typescript
// Cargar contactos
loadContacts(): void

// Seleccionar contacto
selectContact(contact: Contact): void

// Buscar/crear conversación
findOrCreateConversationWithContact(contactId: number): void

// Enviar mensaje
sendMessage(): void

// Cargar mensajes
loadMessages(): void

// Adjuntar archivos
onFileSelected(event: any): void

// Insertar emoji
insertEmoticon(emoticon: string): void
```

## 📱 Responsive

### Desktop (> 992px)
- 3 paneles visibles
- Contactos: 320px
- Chat: flex
- Info: 300px

### Tablet (768px - 992px)
- 2 paneles visibles
- Info panel se superpone
- Contactos: 280px

### Mobile (< 768px)
- 1 panel a la vez
- Contactos se oculta cuando hay chat activo
- Burbujas: 85% de ancho máximo
- Inputs adaptados

## 🎯 Estados de UI

### Estado Inicial
- Lista de contactos visible
- "Selecciona un chat" en el centro
- Botón "Nuevo Chat" prominente

### Cargando
- Spinner de carga
- Texto "Cargando..."

### Sin Contactos
- Icono de usuarios
- Mensaje "No hay contactos disponibles"

### Sin Mensajes
- Icono de chat
- "Envía un mensaje para iniciar"

### Chat Activo
- Header con avatar y nombre
- Área de mensajes scrolleable
- Input de escritura activo

## 🔄 Flujo de Datos

### Envío de Mensaje

```
1. Usuario escribe mensaje
2. Opcional: Adjunta archivos/emojis
3. Click en Enviar o Enter
4. Validación del form
5. Si hay archivos: sendMessageWithAttachments()
6. Si no: sendSimpleMessage()
7. Envío al backend
8. Mensaje agregado localmente
9. WebSocket notifica al receptor
10. Scroll al fondo
11. Form se limpia
```

### Recepción de Mensaje

```
1. WebSocket recibe evento
2. Verifica si es de otro usuario
3. Agrega mensaje a la lista
4. Scroll al fondo
5. Play sonido de notificación
6. Actualiza contador
```

## ⚡ Performance

### Optimizaciones

1. **Lazy Loading**: Carga bajo demanda
2. **Virtual Scrolling**: Para listas largas
3. **Debounce**: En búsqueda de contactos
4. **Memoization**: Fechas formateadas
5. **Change Detection**: OnPush donde sea posible

### Polling Inteligente

- Intervalo: 3 segundos
- Solo si hay conversación activa
- Se detiene al salir del componente

## 🐛 Debugging

### Console Logs

El componente incluye logs detallados:

```typescript
console.log('👤 Selecting contact:', contact);
console.log('💬 Found existing conversation:', convId);
console.log('✨ Creating new conversation');
console.log('📨 New message received:', data);
console.log('📎 Files selected:', files);
```

### Indicadores Visuales

- Estados de carga
- Mensajes de error
- Confirmaciones de envío

## 🚧 Mock Data

Si el servicio falla, se cargan contactos de prueba:

```typescript
María García   - Online  - 2 mensajes no leídos
Juan Pérez     - Offline - Sin mensajes
Ana López      - Online  - 1 mensaje no leído
```

## 🔒 Seguridad

### Validaciones

- Tamaño de archivos (max 10MB)
- Tipos de archivo permitidos
- Sanitización de inputs
- Autenticación requerida

### Permisos

- `messaging.read`: Ver mensajes
- `messaging.send`: Enviar mensajes

## 📚 Dependencias

- **Angular**: v17+
- **RxJS**: Observables y operadores
- **Font Awesome**: Iconos
- **Custom Echo Service**: WebSocket

## 🎓 Mejoras Futuras

### Corto Plazo
- [ ] Mensajes de voz
- [ ] Videollamadas
- [ ] Reacciones con emojis
- [ ] Responder mensajes específicos

### Largo Plazo
- [ ] Encriptación end-to-end
- [ ] Mensajes que se autodestruyen
- [ ] Stories/Estados
- [ ] Grupos con más funciones

## 🎨 Personalización

### Cambiar Colores

Edita `direct-chat.component.scss`:

```scss
// Color primario
$primary-color: #0084ff;

// Colores de burbujas
$bubble-sent: #0084ff;
$bubble-received: #e4e6eb;
```

### Ajustar Tamaños

```scss
// Ancho del panel de contactos
.contacts-panel {
  width: 320px; // Cambia esto
}

// Alto de avatares
.contact-avatar {
  width: 48px;  // Cambia esto
  height: 48px; // Y esto
}
```

## 📖 Ejemplos de Código

### Iniciar Chat Programáticamente

```typescript
// Desde otro componente
this.router.navigate(['/mensajeria/chat'], {
  queryParams: {
    conversationId: 123,
    conversationTitle: 'Chat con Usuario'
  }
});
```

### Escuchar Mensajes Nuevos

```typescript
this.messageService.getNewMessages()
  .subscribe(message => {
    console.log('Nuevo mensaje:', message);
  });
```

## ✅ Testing

### Unit Tests
```bash
ng test --include='**/direct-chat.component.spec.ts'
```

### E2E Tests
```bash
ng e2e --specs='direct-chat.e2e.ts'
```

## 📞 Soporte

Para reportar bugs o solicitar features:
1. Crear issue en el repositorio
2. Incluir screenshots
3. Describir pasos para reproducir
4. Mencionar navegador y versión

---

**Versión**: 1.0  
**Última actualización**: Octubre 2025  
**Autor**: Equipo de Desarrollo  
**Licencia**: MIT











