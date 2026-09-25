# 🚔 Instalación del Módulo de Seguridad Ciudadana

## 📦 Dependencias del Frontend

### 1. Instalar Leaflet (Mapas Interactivos)

```bash
cd intranet-frontend
npm install leaflet leaflet.heat
npm install @types/leaflet --save-dev
```

### 2. Configurar Leaflet en angular.json

Agregar en `angular.json` > `projects` > `architect` > `build` > `options`:

```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/styles.scss"
],
"scripts": [
  "node_modules/leaflet/dist/leaflet.js",
  "node_modules/leaflet.heat/dist/leaflet-heat.js"
]
```

### 3. Opcional: Chart.js para Gráficos

```bash
npm install chart.js ng2-charts
```

### 4. Opcional: Socket.IO para Notificaciones en Tiempo Real

```bash
npm install socket.io-client
```

---

## 🗄️ Configuración del Backend

### 1. Ejecutar Migraciones

```bash
cd intranet-backend
php artisan migrate --path=Modules/SeguridadCiudadana/database/migrations
```

**O ejecutar SQL directamente:**
```bash
mysql -u root -p nombre_base_datos < Modules/SeguridadCiudadana/database/seguridad_ciudadana_install.sql
```

### 2. Registrar Rutas API

En `intranet-backend/routes/api.php`, agregar al final:

```php
// Seguridad Ciudadana
require __DIR__.'/../Modules/SeguridadCiudadana/routes/api.php';
```

### 3. Crear Permisos

Ejecutar este SQL en la base de datos:

```sql
INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES
('seguridad.dashboard.ver', 'web', NOW(), NOW()),
('seguridad.ocurrencias.ver', 'web', NOW(), NOW()),
('seguridad.ocurrencias.crear', 'web', NOW(), NOW()),
('seguridad.ocurrencias.editar', 'web', NOW(), NOW()),
('seguridad.requisitorias.ver', 'web', NOW(), NOW()),
('seguridad.requisitorias.consultar', 'web', NOW(), NOW()),
('seguridad.requisitorias.crear', 'web', NOW(), NOW()),
('seguridad.personal.ver', 'web', NOW(), NOW()),
('seguridad.vehiculos.ver', 'web', NOW(), NOW()),
('seguridad.mapa.ver', 'web', NOW(), NOW()),
('seguridad.reportes.ver', 'web', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at=NOW();
```

### 4. Asignar Permisos a un Rol

```sql
-- Ejemplo: Asignar todos los permisos al rol con ID 1 (Super Admin)
INSERT INTO role_has_permissions (permission_id, role_id)
SELECT id, 1 FROM permissions WHERE name LIKE 'seguridad.%';
```

---

## 🧪 Pruebas del Sistema

### 1. Probar Endpoint de Estadísticas

```bash
curl -X GET "http://localhost:8000/api/seguridad-ciudadana/ocurrencias/stats/estadisticas" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 2. Registrar una Ocurrencia de Prueba

```bash
curl -X POST "http://localhost:8000/api/seguridad-ciudadana/ocurrencias" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "robo",
    "prioridad": "alta",
    "descripcion": "Robo en establecimiento comercial",
    "direccion": "Av. Principal 123",
    "distrito": "Centro",
    "fecha_hora_ocurrencia": "2025-01-15 14:30:00",
    "latitud": -12.0464,
    "longitud": -77.0428
  }'
```

### 3. Consultar Requisitoria de Vehículo

```bash
curl -X POST "http://localhost:8000/api/seguridad-ciudadana/requisitorias/consultar-vehiculo" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"placa": "ABC123"}'
```

---

## 🌐 Acceder al Sistema

### Frontend URLs:

- **Dashboard**: `http://localhost:4200/seguridad-ciudadana/dashboard`
- **Ocurrencias**: `http://localhost:4200/seguridad-ciudadana/ocurrencias`
- **Requisitorias**: `http://localhost:4200/seguridad-ciudadana/requisitorias`
- **Mapa Interactivo**: `http://localhost:4200/seguridad-ciudadana/mapa`

---

## 🗺️ Configurar Coordenadas del Municipio

En `mapa.component.ts`, ajustar las coordenadas del centro:

```typescript
centro = { lat: -12.0464, lng: -77.0428 }; // ← Cambiar por las de tu municipio
zoom = 13; // Ajustar zoom inicial
```

**Para encontrar las coordenadas de tu municipio:**
1. Ve a Google Maps
2. Haz clic derecho en el centro de tu ciudad
3. Copia las coordenadas (formato: lat, lng)

---

## 🔔 Sistema de Notificaciones (Opcional)

Para habilitar notificaciones en tiempo real cuando se detecta una requisitoria:

### 1. Instalar Laravel WebSockets

```bash
cd intranet-backend
composer require beyondcode/laravel-websockets
php artisan websockets:install
```

### 2. Configurar Broadcasting

En `.env`:
```
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=local
PUSHER_APP_KEY=local
PUSHER_APP_SECRET=local
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

### 3. Crear Event para Requisitoria Detectada

```bash
php artisan make:event RequisitoriaDetectada
```

---

## 🎨 Personalización de Colores

En `dashboard.component.scss`, puedes personalizar los colores de las tarjetas:

```scss
.small-box.bg-custom {
  background: linear-gradient(to right, #667eea, #764ba2) !important;
  color: white;
}
```

---

## 🐛 Solución de Problemas

### Error: "Leaflet is not defined"

Asegúrate de que Leaflet esté en `angular.json`:
```json
"scripts": [
  "node_modules/leaflet/dist/leaflet.js",
  "node_modules/leaflet.heat/dist/leaflet-heat.js"
]
```

Luego reinicia el servidor:
```bash
npm start
```

### Error: Migraciones fallan

Ejecuta el SQL directamente:
```bash
mysql -u root -p < Modules/SeguridadCiudadana/database/seguridad_ciudadana_install.sql
```

### Mapa no se muestra

Verifica en la consola del navegador (F12):
- ¿Hay errores de Leaflet?
- ¿Se cargaron los scripts?
- ¿Hay datos en el mapa de calor?

---

## 📚 Documentación Adicional

- **Leaflet**: https://leafletjs.com/
- **Leaflet.heat**: https://github.com/Leaflet/Leaflet.heat
- **Chart.js**: https://www.chartjs.org/

---

## ✅ Checklist de Instalación

- [ ] Instalar dependencias NPM (leaflet, leaflet.heat)
- [ ] Configurar angular.json con scripts de Leaflet
- [ ] Ejecutar migraciones o SQL directo
- [ ] Registrar rutas API en routes/api.php
- [ ] Crear permisos en BD
- [ ] Asignar permisos a roles
- [ ] Ajustar coordenadas del municipio en mapa.component.ts
- [ ] Probar endpoints con Postman/curl
- [ ] Acceder al dashboard en el navegador
- [ ] Verificar que el mapa carga correctamente

---

**¡El sistema está listo para usarse!** 🚀

