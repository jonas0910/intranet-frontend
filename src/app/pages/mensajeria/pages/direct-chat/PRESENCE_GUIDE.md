# 🟢 Guía de Sistema de Presencia - Chat Directo

## 📋 Estado Actual

El chat directo **YA TIENE** implementado un sistema de presencia que detecta si usuarios están activos en tiempo real.

## ✅ Características Implementadas

### 1. **WebSocket Real-Time**
- Escucha evento `user.status.changed`
- Actualiza automáticamente el estado online/offline
- Se sincroniza en todos los clientes conectados

### 2. **Indicadores Visuales**
- 🟢 Punto verde en avatar cuando está online
- Estado en el header del chat
- Lista de contactos muestra quién está activo

### 3. **Modelo de Datos**
```typescript
interface Contact {
  is_online: boolean;      // Estado actual
  last_seen?: string;      // Última vez activo
}
```

## 🔍 Cómo Verificar si un Usuario está Activo

### Opción 1: Desde el Componente

```typescript
// En direct-chat.component.ts

// Verificar un contacto específico
isContactOnline(contactId: number): boolean {
  const contact = this.contacts.find(c => c.id === contactId);
  return contact?.is_online || false;
}

// Obtener contacto seleccionado
const selectedContact = this.getSelectedContact();
if (selectedContact?.is_online) {
  console.log('Usuario está en línea');
} else {
  console.log('Usuario está desconectado');
}
```

### Opción 2: En el Template

```html
<!-- Mostrar estado -->
<div *ngIf="getSelectedContact()?.is_online" class="online-status">
  <i class="fas fa-circle text-success"></i>
  En línea
</div>

<!-- Mostrar última vez activo -->
<div *ngIf="!getSelectedContact()?.is_online && getSelectedContact()?.last_seen">
  Última vez: {{ getSelectedContact()?.last_seen | date:'short' }}
</div>
```

### Opción 3: Escuchar Cambios de Estado

```typescript
// Suscribirse a cambios de estado en tiempo real
this.echoService.listenToChannel(
  'presence',
  'user.status.changed',
  (data: any) => {
    console.log(`Usuario ${data.user_id} ahora está ${data.status}`);
    
    // Actualizar UI
    this.updateContactStatus(data.user_id, data.status);
  }
);
```

## 🚀 Mejoras Adicionales

### A. **Heartbeat Periódico**

Agregar verificación cada 30 segundos:

```typescript
// En direct-chat.component.ts

private startPresenceHeartbeat(): void {
  setInterval(() => {
    // Enviar señal de "estoy activo"
    this.echoService.sendHeartbeat(this.currentUserId);
  }, 30000); // cada 30 segundos
}
```

### B. **Estados Extendidos**

Agregar más estados además de online/offline:

```typescript
type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'do-not-disturb';

interface Contact {
  is_online: boolean;
  status: UserStatus;
  status_message?: string;  // "En reunión", "Disponible", etc.
}
```

### C. **Última Actividad**

Mostrar hace cuánto tiempo estuvo activo:

```typescript
getLastSeenText(contact: Contact): string {
  if (contact.is_online) {
    return 'En línea';
  }
  
  if (!contact.last_seen) {
    return 'Desconectado';
  }
  
  const now = new Date();
  const lastSeen = new Date(contact.last_seen);
  const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
  
  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} días`;
}
```

### D. **Notificaciones de Estado**

Notificar cuando un contacto se conecta:

```typescript
private handleUserStatusChanged(data: any): void {
  const contact = this.contacts.find(c => c.id === data.user_id);
  
  if (contact && data.status === 'online') {
    // Mostrar notificación
    this.showToast(`${contact.name} ahora está en línea`, 'success');
    
    // Opcional: Sonido
    this.playNotificationSound();
  }
}
```

### E. **Presencia en Grupo**

Para chats grupales, mostrar quién está viendo:

```typescript
interface GroupPresence {
  conversation_id: number;
  viewers: Array<{
    user_id: number;
    user_name: string;
    viewing_since: string;
  }>;
}

// En el template
<div class="viewers-indicator">
  <span *ngFor="let viewer of currentViewers">
    <img [src]="viewer.avatar" class="viewer-avatar">
  </span>
  <small>{{ currentViewers.length }} viendo ahora</small>
</div>
```

## 📡 Backend Requirements

Para que funcione completamente, el backend debe:

### 1. **Broadcast de Estado**

```php
// Laravel Backend
broadcast(new UserStatusChanged($userId, 'online'));
```

### 2. **API Endpoint**

```php
// GET /api/users/{id}/status
{
  "user_id": 123,
  "status": "online",
  "last_seen": "2025-10-08T10:30:00Z"
}
```

### 3. **Presence Channel**

```php
// Broadcasting config
Broadcast::channel('presence-chat.{conversationId}', function ($user, $conversationId) {
    return [
        'id' => $user->id,
        'name' => $user->name,
        'is_online' => true
    ];
});
```

## 🎨 Estilos de Indicadores

Los estilos ya están en `direct-chat.component.scss`:

```scss
.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: #31a24c;  // Verde online
  border: 3px solid #fff;
  border-radius: 50%;
}

// Estados adicionales
.status-away {
  background: #ff9500;  // Naranja away
}

.status-busy {
  background: #ff3b30;  // Rojo busy
}

.status-offline {
  background: #8e8e93;  // Gris offline
}
```

## 🧪 Testing

### Verificar Estado Online

```typescript
// En consola del navegador
const component = /* tu instancia del componente */;
console.log('Contactos online:', component.contacts.filter(c => c.is_online));
```

### Simular Cambio de Estado

```typescript
// Forzar cambio de estado para testing
this.contacts[0].is_online = true;
this.cdr.detectChanges();
```

## 📊 Métricas Útiles

```typescript
// Contar usuarios online
get onlineContactsCount(): number {
  return this.contacts.filter(c => c.is_online).length;
}

// Porcentaje de usuarios activos
get activePercentage(): number {
  if (this.contacts.length === 0) return 0;
  return (this.onlineContactsCount / this.contacts.length) * 100;
}
```

## ⚡ Performance

### Throttling de Updates

```typescript
import { throttleTime } from 'rxjs/operators';

// Limitar actualizaciones de estado a 1 cada 5 segundos
this.statusUpdates$.pipe(
  throttleTime(5000)
).subscribe(status => {
  this.updateContactStatus(status);
});
```

### Cleanup

```typescript
ngOnDestroy(): void {
  // Limpiar listeners de presencia
  this.echoService.leaveChannel('presence');
  this.destroy$.next();
  this.destroy$.complete();
}
```

## 🔒 Privacidad

### Ocultar Estado

Permitir a usuarios ocultar su estado:

```typescript
interface UserPrivacySettings {
  show_online_status: boolean;
  show_last_seen: boolean;
}

// Verificar antes de mostrar
shouldShowOnlineStatus(contact: Contact): boolean {
  return contact.privacy?.show_online_status !== false;
}
```

## 📝 Ejemplo Completo

```typescript
// Método completo para agregar al componente
updateContactPresence(): void {
  // Escuchar cambios de presencia
  this.echoService.listenToChannel(
    'presence',
    'user.status.changed',
    (data: any) => {
      const contact = this.contacts.find(c => c.id === data.user_id);
      
      if (contact) {
        // Actualizar estado
        contact.is_online = data.status === 'online';
        contact.last_seen = data.timestamp;
        
        // Log para debugging
        console.log(`📡 ${contact.name}: ${data.status}`);
        
        // Actualizar UI
        this.cdr.detectChanges();
        
        // Notificar si es necesario
        if (data.status === 'online' && this.shouldNotify(contact)) {
          this.showOnlineNotification(contact);
        }
      }
    }
  );
}
```

## 🎯 Resumen

✅ **El sistema ya está implementado**
✅ **Funciona con WebSocket en tiempo real**
✅ **Indicadores visuales presentes**
✅ **Actualización automática**

Solo necesitas:
1. Asegurar que el backend emite eventos `user.status.changed`
2. Conectar usuarios al canal de presencia
3. Los indicadores visuales ya funcionarán automáticamente

---

**Estado**: ✅ Implementado  
**Tiempo Real**: ✅ Sí  
**Backend Required**: ⚠️ Debe emitir eventos  
**Testing**: ✅ Mock data disponible











