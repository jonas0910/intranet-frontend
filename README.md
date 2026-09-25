# Intranet Frontend

Frontend de la Intranet, desarrollado con **Angular 19**, **AdminLTE 3**, **Bootstrap 4** y un Design System propio para los distintos subsistemas.

> **Importante:** este repositorio contiene únicamente el frontend. No incluye el backend, sus migraciones, su archivo `.env` ni los procesos de WebSocket. Esos servicios deben estar disponibles por separado para poder iniciar sesión, cargar datos, acceder a archivos o usar mensajería en tiempo real.

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/jonas0910/intranet-frontend.git
cd intranet-frontend

# 2. Instalar las dependencias bloqueadas
npm ci

# 3. Levantar el servidor de desarrollo
npm start
```

Abre [http://localhost:4200/](http://localhost:4200/) en el navegador. Antes de iniciar el frontend, asegúrate de tener el backend HTTP disponible en `http://127.0.0.1:8001` (o modifica el proxy como se explica más abajo).

## Requisitos

### Node.js y npm

Se recomienda **Node.js 24.x** con el npm incluido en la instalación.

El proyecto utiliza Angular 19.2. Angular acepta las ramas `^18.19.1`, `^20.11.1` y `>=22.0.0`, pero el `package-lock.json` actual también contiene dependencias con requisitos más exigentes (`laravel-echo` y `select2`). Por eso Node 24 es la opción recomendada para una instalación limpia.

Comprueba las versiones antes de instalar:

```bash
node --version
npm --version
```

No es necesario instalar Angular CLI globalmente: el proyecto ya incluye `@angular/cli` como dependencia de desarrollo. Si necesitas ejecutar un comando de Angular, utiliza el script local:

```bash
npm run ng -- version
```

### Git

Se necesita Git para clonar el repositorio. Si el repositorio es privado, configura previamente tus credenciales de GitHub o una clave SSH.

### Backend

El frontend espera por defecto un backend HTTP en:

```text
http://127.0.0.1:8001
```

El backend debe ser compatible con las rutas que consume la aplicación. Si es un backend Laravel, consulta el procedimiento de arranque de su repositorio y, si corresponde, ejecútalo en otra terminal con el puerto `8001`.

## Instalación desde cero

### 1. Clonar el proyecto

```bash
git clone https://github.com/jonas0910/intranet-frontend.git
cd intranet-frontend
```

Si utilizas SSH, la alternativa es:

```bash
git clone git@github.com:jonas0910/intranet-frontend.git
cd intranet-frontend
```

### 2. Instalar dependencias

Para una instalación reproducible usa `npm ci`, que instala las versiones exactas de `package-lock.json`:

```bash
npm ci
```

El script `postinstall` ejecuta `patch-package` y aplica los parches de `patches/`, incluido el parche de `angular-datatables`. No ejecutes la instalación normal con `--ignore-scripts`, porque los parches son necesarios.

El lockfile contiene algunas dependencias con peers declarados para Angular 18 aunque el proyecto usa Angular 19. Si `npm ci` termina con un error `ERESOLVE`, prueba:

```bash
npm ci --legacy-peer-deps
```

Esta opción sólo relaja la comprobación de peers; no resuelve las incompatibilidades subyacentes. Si modificas deliberadamente las dependencias y quieres actualizar el lockfile, usa `npm install` en lugar de `npm ci`.

## Configuración del backend y proxy

El comando `npm start` usa `proxy.conf.json`; no usa `proxy.conf.js`.

En `proxy.conf.json` se definen estas reglas:

| Petición del navegador | Destino en el backend | Regla |
| --- | --- | --- |
| `/api/*` | `http://127.0.0.1:8001/*` | elimina el prefijo `/api` |
| `/storage/*` | `http://127.0.0.1:8001/storage/*` | conserva el prefijo |
| `/media/*` | `http://127.0.0.1:8001/media/*` | conserva el prefijo |

Por ejemplo, con la configuración actual:

```text
POST /api/auth/login  ->  POST http://127.0.0.1:8001/auth/login
GET  /api/auth/me     ->  GET  http://127.0.0.1:8001/auth/me
```

Si el backend no está en `127.0.0.1:8001`, cambia el valor `target` de las rutas `/api`, `/storage` y `/media` en `proxy.conf.json`. No basta con cambiar sólo una sección si las tres apuntan al mismo servidor.

La configuración actual elimina el prefijo `/api` de las peticiones: el backend debe exponer las rutas sin ese prefijo. Si el backend sí expone `/api/*`, ajusta el `pathRewrite` o la configuración del backend antes de probar el login.

## Levantar el servidor de desarrollo

Con las dependencias instaladas y el backend disponible, ejecuta:

```bash
npm start
```

El script equivale a:

```bash
ng serve --proxy-config proxy.conf.json
```

Después de compilar, abre:

```text
http://localhost:4200/
```

Los cambios en el código se recompilan y actualizan automáticamente. Para detener el servidor, pulsa `Ctrl+C`.

Si el puerto `4200` está ocupado, utiliza otro puerto:

```bash
npm start -- --port 4201
```

`npm run start:proxy` es un alias de `npm start`; no activa un proxy distinto.

## WebSockets y mensajería

La configuración de desarrollo está en `src/environments/environment.ts`:

- Host: `127.0.0.1`
- Puerto: `8081`
- URL esperada: `ws://127.0.0.1:8081`
- TLS: desactivado

El WebSocket no pasa por `proxy.conf.json`; el servidor de mensajería debe escuchar directamente en el puerto `8081`. La implementación actual utiliza WebSocket nativo con eventos JSON propios, por lo que el servidor backend debe ser compatible con ese protocolo y no asumir automáticamente una conexión Pusher o Socket.IO.

La configuración de producción está en `src/environments/environment.prod.ts`. Revísala antes de desplegar, especialmente el dominio, el puerto y el uso de `wss://`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia Angular en modo desarrollo y carga el proxy. |
| `npm run start:proxy` | Alias de `npm start`. |
| `npm run build` | Genera el build de producción. |
| `npm run watch` | Recompila el build de desarrollo continuamente; **no** inicia un servidor web. |
| `npm test` | Ejecuta las pruebas Karma en modo watch. |
| `npm run ng -- <comando>` | Ejecuta Angular CLI usando la instalación local. |

Para generar un componente, por ejemplo:

```bash
npm run ng -- generate component nombre-del-componente
```

## Build de producción

```bash
npm run build
```

El comando usa la configuración `production` por defecto. Los artefactos estáticos del navegador se generan en:

```text
dist/gestion/browser/
```

El entrypoint principal es `dist/gestion/browser/index.html`. Al desplegarlo, configura el servidor web (Nginx, Apache, etc.) para servir esa carpeta y redirigir las rutas de la SPA a `index.html`.

La configuración productiva usa actualmente:

```text
https://dev.notariabohorquezvega.com.pe/api
```

Por eso, un build generado con `npm run build` no apunta automáticamente al backend local `127.0.0.1:8001`. Para generar un build de desarrollo y comprobarlo localmente, utiliza:

```bash
npm run ng -- build --configuration development
```

El build puede mostrar advertencias de Sass, presupuestos de estilos o dependencias CommonJS; estas advertencias no impiden la compilación mientras el comando termine correctamente.

### SSR

El proyecto tiene `ssr: false` en `angular.json`; el flujo actual es una aplicación cliente (CSR). El script `serve:ssr:intranet-frontend` apunta a una ruta de build antigua y no forma parte del procedimiento de puesta en marcha local.

## Pruebas unitarias

Las pruebas utilizan Karma y requieren Chrome o Chromium instalado. Para ejecutarlas una sola vez, sin dejar Karma en modo watch:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

La suite actual contiene pruebas de mensajería con algunas expectativas desalineadas respecto de la implementación; por eso puede fallar aunque la aplicación compile correctamente. No existe un target E2E configurado en este workspace.

## Problemas frecuentes

### `npm ci` muestra `ERESOLVE`

El proyecto tiene peers de Angular 18 y Angular 19 mezclados. Usa `npm ci --legacy-peer-deps` y no elimines los scripts de instalación.

### El navegador recibe `404` o `502` al iniciar sesión

Verifica que el backend esté levantado en `127.0.0.1:8001`, que `proxy.conf.json` sea el archivo correcto y que la ruta recibida por el backend no tenga un prefijo `/api` duplicado.

### La mensajería no conecta

Comprueba que el servidor WebSocket escuche en `127.0.0.1:8081` y que el protocolo acepte los eventos JSON que utiliza el frontend. El proxy HTTP no reenvía WebSockets.

### El puerto `4200` está ocupado

```bash
npm start -- --port 4201
```

## Documentación de desarrollo

Antes de crear un nuevo subsistema, revisa las guías internas:

- [Patrón de diseño para nuevos subsistemas](docs/PATRON-DISEÑO-SUBSISTEMAS.md)
- [Patrón CRUD para planillas](docs/PATRON_CRUD_PLANILLAS.md)
