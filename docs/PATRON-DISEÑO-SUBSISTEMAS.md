# Patrón de diseño UI para nuevos subsistemas

Esta guía indica **cómo aplicar el patrón de diseño UI** (Design System) a un **nuevo subsistema** para que cards, tablas, formularios, toasts y diálogos de confirmación queden unificados y no quede nada sin aplicar.

---

## 1. Identificador del subsistema

- Define un **id único** en kebab-case, por ejemplo: `activos-fijos`, `planillas`, `gestion-documental`.
- Ese id se usará en rutas, en `DesignSystemService` y en el layout.

---

## 2. Tema por defecto del subsistema (DesignSystemService)

En **`src/app/services/design-system.service.ts`**:

1. **Añade el tema CRUD por defecto** en `SUBSYSTEM_CRUD_DEFAULTS`:

```ts
const SUBSYSTEM_CRUD_DEFAULTS: Record<string, Partial<CrudViewConfig>> = {
  'activos-fijos': {
    cardOutlineColor: 'card-success',
    newBtnClass: 'btn-success',
    viewBtnClass: 'btn-success',
    editBtnClass: 'btn-warning',
    excelBtnClass: 'btn-success',
    pdfBtnClass: 'btn-danger',
    printBtnClass: 'btn-info',
    statusActiveClass: 'badge-success',
    tableHeaderBg: '#d4edda',
    tableHeaderColor: '#155724'
  },
  // Añade aquí tu subsistema, ej. 'mi-modulo': { cardOutlineColor: 'card-primary', ... }
};
```

2. **Opcional:** Si quieres tema específico para Toast o Confirm Dialog del subsistema, guarda la config desde la pantalla **Patrones de diseño** (seleccionando el subsistema y guardando). Si no guardas nada, se usa la config global.

---

## 3. Layout de página (SystemLayoutComponent)

Todas las vistas del subsistema deben usar **`<app-system-layout>`** con el **subsystem** correcto para que se apliquen colores y variables CSS del patrón:

```html
<app-system-layout
  [title]="'Título de la página'"
  [subtitle]="'Subtítulo opcional'"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Mi Módulo', url: '/mi-modulo'}, {label: 'Vista actual'}]"
  [subsystem]="'mi-modulo'">

  <div class="row">
    <div class="col-12">
      <!-- Contenido -->
    </div>
  </div>
</app-system-layout>
```

- **`[subsystem]="'mi-modulo'"`** es obligatorio: hace que se llame a `setActiveSubsystem('mi-modulo')` y a `applyCrudViewCssVariables('mi-modulo')`, y que los toasts usen la config del subsistema.

---

## 4. Cards (contenedores de tablas y formularios)

Usa siempre el mismo patrón para que el **Card Outlined** se vea igual que en el resto del sistema:

```html
<div class="card elevation-1 mb-3"
  [ngClass]="cv?.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-primary'"
  [style.border-radius.px]="(cv?.cardBorderRadius != null ? cv.cardBorderRadius : 6)">
  <div class="card-header">
    <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">Título del bloque</h3>
  </div>
  <div class="card-body">
    <!-- Contenido: tabla, formulario, etc. -->
  </div>
</div>
```

- Sustituye `card-primary` por el color por defecto de tu subsistema (ej. `card-success` para activos-fijos) si no hay `cv.cardOutlineColor`.

---

## 5. Configuración CRUD (cv) en el componente

Para que **cv** sea siempre la del subsistema (y no dependa del orden de carga del layout):

**Opción A – Componente que extiende `CrudListExportBase`:**

```ts
override get cv(): CrudViewConfig {
  return this.dsService.getCrudViewFor('mi-modulo');
}
```

**Opción B – Componente que no extiende la base:**

```ts
constructor(private dsService: DesignSystemService) {}

get cv(): CrudViewConfig {
  return this.dsService.getCrudViewFor('mi-modulo');
}
```

- Usa el **mismo id** que en `[subsystem]="'mi-modulo'"` y en `SUBSYSTEM_CRUD_DEFAULTS`.

---

## 6. Mensajes: Toast en lugar de `alert()`

No uses **`alert()`** para éxito, error o información. Usa **`ToastService`** para que los mensajes sigan el patrón de diseño (y el tema del subsistema si aplica):

```ts
import { ToastService } from '../../../services/toast.service';

constructor(private toast: ToastService) {}

// Éxito
this.toast.success('Registro guardado correctamente', 'Éxito');

// Error
this.toast.error('No se pudo guardar. Intente de nuevo.', 'Error');

// Advertencia
this.toast.warning('Complete todos los campos requeridos', 'Advertencia');

// Información
this.toast.info('Procesando su solicitud...', 'Información');
```

- El **Toast Container** usa la config del subsistema activo (`getToastFor(activeSubsystem)`), así que al estar dentro de tu módulo con `[subsystem]="'mi-modulo'"` los toasts ya se verán con el estilo del subsistema.

---

## 7. Confirmaciones: ConfirmDialog en lugar de `confirm()`

No uses **`confirm()`** del navegador. Usa **`ConfirmDialogComponent`** con **NgbModal** y pasa el **subsystem** para que el diálogo use la config del subsistema:

```ts
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

constructor(private modalService: NgbModal) {}

confirmarEliminar(item: any): void {
  const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
  ref.componentInstance.subsystem = 'mi-modulo';
  ref.componentInstance.title = 'Eliminar registro';
  ref.componentInstance.message = `¿Está seguro de eliminar "${item.nombre}"?`;
  ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
  ref.componentInstance.type = 'danger';
  ref.componentInstance.confirmText = 'Sí, eliminar';
  ref.componentInstance.confirmIcon = 'fas fa-trash';
  ref.componentInstance.confirmClass = 'btn-danger';

  ref.result.then(
    () => {
      this.eliminar(item.id).subscribe({
        next: () => this.toast.success('Eliminado correctamente', 'Éxito'),
        error: (e) => this.toast.error('Error al eliminar', 'Error')
      });
    },
    () => { }
  );
}
```

- **`ref.componentInstance.subsystem = 'mi-modulo'`** hace que el diálogo use `getConfirmDialogFor('mi-modulo')`.

---

## 8. Checklist para un nuevo subsistema

- [ ] **Id del subsistema** definido (kebab-case).
- [ ] **SUBSYSTEM_CRUD_DEFAULTS** en `design-system.service.ts` con al menos `cardOutlineColor` (y opcionalmente botones, tabla, etc.).
- [ ] **Todas las rutas/vistas** del subsistema usan `<app-system-layout [subsystem]="'mi-modulo'">`.
- [ ] **Todas las cards** de listados y formularios usan el patrón con `card-outline`, `cv.cardOutlineColor` y fallback de color.
- [ ] **Todos los componentes** que usan `cv` obtienen la config con `getCrudViewFor('mi-modulo')` (getter o override de `cv`).
- [ ] **Ningún `alert()`**: reemplazados por `ToastService` (success / error / warning / info).
- [ ] **Ningún `confirm()`**: reemplazados por `ConfirmDialogComponent` con `subsystem = 'mi-modulo'`.
- [ ] **Opcional:** En Patrones de diseño, seleccionar el subsistema y guardar Toast / Confirm Dialog si quieres colores o textos distintos al global.

---

## 9. Referencia: subsistema Activos Fijos

- **Id:** `activos-fijos`
- **Tema por defecto:** verde (`card-success`, `btn-success`, etc.).
- **Archivos de referencia:**
  - `src/app/pages/activos-fijos/activos/lista-activos.component.ts` (override `cv`, cards, modales).
  - `src/app/pages/activos-fijos/configuracion/configuracion.component.ts` (getter `cv`, toasts).
  - `src/app/services/design-system.service.ts` (SUBSYSTEM_CRUD_DEFAULTS, getCrudViewFor, getToastFor, getConfirmDialogFor).
  - `src/app/components/toast-container/toast-container.component.ts` (uso de config por subsistema activo).

Con esto, el patrón de diseño UI (cards, tablas, formularios, toasts y diálogos de confirmación) queda aplicado de forma uniforme en todo el subsistema.
