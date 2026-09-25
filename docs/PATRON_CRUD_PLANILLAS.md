# Patrón de diseño CRUD – Planillas (ejemplo: Reglas de Asistencia)

Este documento describe el **patrón de diseño** con el que se implementó el CRUD de **Reglas de Asistencia** (`/planillas/reglas-asistencia`). Sirve como referencia para construir otros CRUDs en el módulo Planillas y en la intranet.

---

## 1. Referencia implementada

- **Ruta:** `http://localhost:4200/planillas/reglas-asistencia`
- **Componente:** `src/app/pages/planillas/reglas-asistencia/reglas-asistencia.component.ts`
- **Servicio:** `src/app/services/attendance-rule.service.ts`

---

## 2. Elementos del patrón

### 2.1 Servicio (API)

- Extiende **`GestionTablasBaseService<T>`** (`src/app/services/gestion-tablas-base.service.ts`).
- El base ya expone: `getAll()`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`.
- El servicio concreto:
  - Pasa al padre el `endpoint` (ej. `'/planillas/attendance-rules'`).
  - Añade métodos específicos si aplica (ej. `setDefault(id)`, `getActive()`).

```ts
// Ejemplo: attendance-rule.service.ts
export class AttendanceRuleService extends GestionTablasBaseService<AttendanceRule> {
  constructor(http: HttpClient) {
    super(http, '/planillas/attendance-rules');
  }
  setDefault(id: number): Observable<ApiResponse<AttendanceRule>> { ... }
}
```

### 2.2 Componentes compartidos (shared)

| Componente | Uso |
|------------|-----|
| **PageHeaderComponent** | Título, subtítulo y breadcrumbs arriba de la página. |
| **CrudActionsComponent** | Botones Ver / Editar / Eliminar por fila (emite `onView`, `onEdit`, `onDelete`). |
| **StatusBadgeComponent** | Badge de estado (activo/inactivo, etc.). |

Importación:

```ts
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
```

### 2.3 Listado (tabla)

- **DataTables** (`angular-datatables`): tabla con paginación, búsqueda, orden.
- Opciones típicas: `pagingType: 'full_numbers'`, `pageLength: 10`, `responsive: true`, `stateSave: true`.
- Idioma: `language: { url: 'assets/datatables/i18n/es-ES.json' }`.
- Botones de exportación: Excel, PDF, Imprimir (`dom: 'Bfrtip'`, `buttons: [...]`).
- Datos: array en el componente (ej. `reglas`), cargado con `service.getAll()` y disparando `dtTrigger.next(null)` después de asignar.

### 2.4 Modales (Bootstrap)

- **Modal crear/editar** (`#editModal`): formulario reactivo; mismo modal para alta y edición (`isEdit` + `selected`).
- **Modal ver** (`#viewModal`): solo lectura del ítem seleccionado.
- Apertura/cierre con Bootstrap 5: `new (window as any).bootstrap.Modal(element).show()` / `.hide()`.
- Referencias con `@ViewChild('editModal') editModalRef` y `@ViewChild('viewModal') viewModalRef`.

### 2.5 Formulario

- **Reactive Forms** (`FormBuilder`, `FormGroup`, `Validators`).
- `initForm()`: define el `FormGroup` con valores por defecto.
- **Crear:** `form.reset({ ... })` con valores iniciales y luego abrir modal.
- **Editar:** `form.patchValue(item)` y abrir modal.
- **Guardar:** si `isEdit && selected?.id` → `service.update(id, form.value)`, si no → `service.create(form.value)`. Tras éxito: `reloadTable()` y cerrar modal.

### 2.6 Flujo del componente

1. **ngOnInit:** `initDataTable()`, `load()` (getAll + dtTrigger).
2. **Nueva:** `openCreate()` → reset form, abrir modal crear/editar.
3. **Editar:** `openEdit(item)` → patchValue, abrir mismo modal.
4. **Ver:** `openView(item)` → abrir modal de solo lectura.
5. **Guardar:** `save()` → create o update según `isEdit`/`selected`, luego recargar tabla y cerrar modal.
6. **Eliminar:** `delete(item)` → confirm + `service.delete(id)` + recargar tabla.
7. **Cerrar modales:** `closeEdit()`, `closeView()`.

---

## 3. Estructura de archivos sugerida

```
src/app/
├── pages/planillas/
│   └── reglas-asistencia/
│       ├── reglas-asistencia.component.ts
│       ├── reglas-asistencia.component.html
│       └── reglas-asistencia.component.scss
├── services/
│   ├── gestion-tablas-base.service.ts   (base CRUD)
│   └── attendance-rule.service.ts        (servicio concreto)
└── shared/components/
    ├── page-header/
    ├── crud-actions/
    └── status-badge/
```

---

## 4. Ruta

En `app.routes.ts` (o en el módulo de planillas):

```ts
{
  path: 'planillas/reglas-asistencia',
  loadComponent: () => import('./pages/planillas/reglas-asistencia/reglas-asistencia.component')
    .then(m => m.ReglasAsistenciaComponent),
  canActivate: [authGuard]
}
```

---

## 5. Cómo replicar el patrón en otro CRUD

1. Crear interfaz del modelo (ej. `MiEntidad`).
2. Crear servicio que extienda `GestionTablasBaseService<MiEntidad>` con el endpoint correcto.
3. Crear el componente:
   - Importar `PageHeaderComponent`, `CrudActionsComponent`, `StatusBadgeComponent`, `DataTablesModule`, `ReactiveFormsModule`.
   - Definir `dtOptions`, `dtTrigger`, `form`, `selected`, `isEdit`, `saving`.
   - Implementar `initForm()`, `initDataTable()`, `load()`, `openCreate()`, `openEdit()`, `openView()`, `save()`, `delete()`, `closeEdit()`, `closeView()`, `reloadTable()`.
4. Template: cabecera con `app-page-header`, card con tabla DataTables, botón “Nuevo”, columnas con `app-crud-actions` y `app-status-badge` si aplica, modal crear/editar y modal ver.
5. Registrar la ruta y enlazar en el menú de Planillas.

---

## 6. Dependencias

- `angular-datatables` + estilos/idioma (ej. `assets/datatables/i18n/es-ES.json`).
- Bootstrap 5 (modales).
- `@angular/forms` (ReactiveFormsModule).
- Servicio base: `GestionTablasBaseService` usa `environment.apiUrl` para la API.

---

## 7. Patrón CRUD dinámico (colores, ubicación, visibilidad)

El mismo CRUD puede hacerse **dinámico**: el usuario (o un administrador) puede cambiar colores, posición de los botones, tamaño del modal y qué acciones mostrar, sin tocar código.

### 7.1 Servicio: CrudLayoutService

- **Archivo:** `src/app/services/crud-layout.service.ts`
- **Qué hace:** Guarda y expone una configuración por pantalla (o global) con:
  - **Tema:** clases CSS del card (`cardOutlineClass`, `cardHeaderClass`), botón crear (`btnCreateClass`), headers de modales (`modalEditHeaderClass`, `modalViewHeaderClass`), tabla (`tableHeaderClass`), botones Ver/Editar/Eliminar (`btnViewClass`, `btnEditClass`, `btnDeleteClass`), botón guardar (`btnSaveClass`).
  - **Layout:** posición de las acciones (`actionsPosition`: `'start'` | `'end'`), tamaño del modal (`modalSize`: `'modal-sm'` | `'modal-lg'` | `'modal-xl'`).
  - **Visibilidad:** `showViewButton`, `showEditButton`, `showDeleteButton`, `showExportButtons`.

La configuración se **persiste en `localStorage`** (por pantalla o global), así que los cambios se mantienen al recargar.

### 7.2 Uso en el componente

1. Inyectar `CrudLayoutService` y definir una clave de pantalla (ej. `'reglas-asistencia'`).
2. Obtener la config: `layoutConfig = this.crudLayout.getConfig(SCREEN_KEY)` (en `ngOnInit` y cuando se actualice).
3. En el template:
   - Card: `[ngClass]="layoutConfig.theme.cardOutlineClass"`.
   - Card header: `[ngClass]="layoutConfig.theme.cardHeaderClass"` y, si aplica, `[class.flex-row-reverse]="layoutConfig.actionsPosition === 'start'"` para poner los botones a la izquierda.
   - Botón "Nueva": `[ngClass]="layoutConfig.theme.btnCreateClass"`.
   - Modal crear/editar: `[ngClass]="layoutConfig.modalSize"` en el `modal-dialog`; header `[ngClass]="layoutConfig.theme.modalEditHeaderClass"`; botón guardar `[ngClass]="layoutConfig.theme.btnSaveClass"`.
   - Modal ver: header `[ngClass]="layoutConfig.theme.modalViewHeaderClass"`.
   - Tabla: `<thead [ngClass]="layoutConfig.theme.tableHeaderClass">`.
   - `app-crud-actions`: `[showView]="layoutConfig.showViewButton"`, `[showEdit]="layoutConfig.showEditButton"`, `[showDelete]="layoutConfig.showDeleteButton"`, y opcionalmente `[btnViewClass]="layoutConfig.theme.btnViewClass"`, etc.
4. DataTables: si `layoutConfig.showExportButtons` es falso, no incluir `dom: 'Bfrtip'` ni `buttons` en `dtOptions` (o usar `dom: 'rtip'`).

### 7.3 Modal “Configurar vista”

En Reglas de Asistencia se añade un botón (icono de paleta) que abre un modal donde se puede:

- Elegir un **tema predefinido** (Por defecto, Verde, Azul info, Naranja, Oscuro).
- Cambiar la **ubicación** del botón “Nueva Regla” (derecha / izquierda).
- Cambiar el **tamaño del modal** crear/editar (pequeño, grande, extra grande).
- Activar o desactivar los botones **Ver**, **Editar**, **Eliminar** y los **botones de exportar** (Excel, PDF, Imprimir).
- **Restaurar** la configuración por defecto.

Métodos del servicio útiles:

- `getConfig(screenKey?)`: devuelve la config (por pantalla o global).
- `setTheme(theme, screenKey?)`: actualiza solo el tema.
- `setLayout(layout, screenKey?)`: actualiza posición, tamaño de modal o visibilidad de botones.
- `setConfig(config, screenKey?)`: actualiza config completa.
- `resetConfig(screenKey?)`: restaura valores por defecto.
- `getPresetThemes()`: lista de temas predefinidos para el selector.

### 7.4 Componente CrudActionsComponent

Para que los colores de los botones Ver/Editar/Eliminar sean dinámicos, `CrudActionsComponent` admite entradas opcionales:

- `btnViewClass`, `btnEditClass`, `btnDeleteClass` (por defecto `btn-info`, `btn-warning`, `btn-danger`).

Así el tema puede cambiar también el estilo de estos botones.

### 7.5 Replicar el CRUD dinámico en otra pantalla

1. Inyectar `CrudLayoutService` y definir `SCREEN_KEY`.
2. Añadir `layoutConfig = this.crudLayout.getConfig(SCREEN_KEY)` y actualizarlo en `ngOnInit` y al cambiar opciones.
3. Enlazar en el template todas las clases y opciones (card, modales, tabla, `app-crud-actions`) con `layoutConfig` como en 7.2.
4. Opcional: añadir un botón “Configurar vista” que abra un modal similar al de Reglas de Asistencia (temas, posición, tamaño modal, switches de visibilidad, restaurar).

Este CRUD de Reglas de Asistencia es la **implementación de referencia** del patrón (estático y dinámico) en la intranet.
