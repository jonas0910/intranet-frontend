# IntranetFrontend

Este proyecto es el frontend de la Intranet, desarrollado con **Angular 19** y configurado con **AdminLTE 3**, **Bootstrap 4** y un sistema de diseño (Design System) unificado para la gestión de subsistemas.

---

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu entorno local:

1. **Node.js**: Se recomienda utilizar una versión **LTS activa** (v18.x, v20.x o v22.x) compatible con Angular 19.
   - Verifica tu versión actual con:
     ```bash
     node -v
     ```
2. **NPM**: Viene incluido automáticamente al instalar Node.js.
3. **Angular CLI** (Opcional, para ejecutar comandos globales `ng`):
   ```bash
   npm install -g @angular/cli@19
   ```

---

## 📦 Instalación y Configuración Inicial

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/jonas0910/intranet-frontend.git
   cd intranet-frontend
   ```

2. **Instalar dependencias**:
   Ejecuta el gestor de paquetes para instalar todas las dependencias necesarias:
   ```bash
   npm install
   ```
   
   > ⚠️ **Nota importante**: Este proyecto hace uso de `patch-package` para solucionar bugs e incompatibilidades en librerías externas (especialmente en `angular-datatables`). Al ejecutar `npm install`, el script `postinstall` se encargará de aplicar automáticamente los parches ubicados en el directorio `/patches`.

---

## ⚙️ Configuración del Proxy (Backend)

Para evitar problemas de CORS y facilitar la comunicación durante el desarrollo, el frontend está configurado para realizar un proxy de las peticiones de API y multimedia hacia tu backend local.

- **URL de Backend por defecto**: `http://127.0.0.1:8001`
- **Rutas mapeadas por el proxy**:
  - `/api` ➡️ Redirige a la API del servidor (por ejemplo, backend Laravel).
  - `/storage` ➡️ Acceso a archivos del backend.
  - `/media` ➡️ Acceso a multimedia del backend.

Si necesitas cambiar la dirección o el puerto de tu backend local, edita la propiedad `target` en el archivo **`proxy.conf.json`**:
```json
{
  "/api": {
    "target": "http://127.0.0.1:TU_PUERTO",
    "secure": false,
    ...
  }
}
```

---

## 🏃 Levantar el Servidor de Desarrollo

Para iniciar el servidor de desarrollo local de Angular cargando la configuración del proxy, simplemente ejecuta:

```bash
npm start
```

*(Esto equivale a ejecutar `ng serve --proxy-config proxy.conf.json`)*

Una vez que compile correctamente:
1. Abre tu navegador en **[http://localhost:4200/](http://localhost:4200/)**.
2. Los cambios realizados en el código fuente se reflejarán y recargarán automáticamente en el navegador.

---

## 📡 Websockets y Comunicación en Tiempo Real

El sistema cuenta con soporte para mensajería en tiempo real integrado mediante Laravel Echo / Pusher / Socket.io.
- **Host por defecto**: `127.0.0.1`
- **Puerto por defecto**: `8081`

Puedes consultar o modificar estas configuraciones en los archivos de entorno:
- Desarrollo: `src/environments/environment.ts`
- Producción: `src/environments/environment.prod.ts`

---

## 🏗️ Compilación para Producción (Build)

Para compilar la aplicación optimizada para el entorno de producción:

```bash
npm run build
```

Este comando generará los artefactos optimizados dentro de la carpeta `dist/intranet-frontend/` listos para ser desplegados en tu servidor web (Nginx, Apache, etc.).

---

## 🧪 Pruebas Unitarias

Si deseas ejecutar el conjunto de pruebas unitarias con el test runner [Karma](https://karma-runner.github.io):

```bash
npm run test
```

---

## 📂 Documentación de Arquitectura y Patrones

El proyecto sigue una arquitectura unificada y modular, con un sistema de diseño propio (Design System) para homogeneizar las interfaces de usuario. Antes de desarrollar nuevas pantallas o subsistemas, te sugerimos leer las siguientes guías internas:

* 📑 **[Patrón de Diseño para Nuevos Subsistemas](docs/PATRON-DISEÑO-SUBSISTEMAS.md)**: Cómo estructurar cards, tablas, formularios, modales y layouts de forma unificada.
* 📑 **[Patrón CRUD para Planillas](docs/PATRON_CRUD_PLANILLAS.md)**: Guía paso a paso para la implementación de planillas y formularios de gestión.
