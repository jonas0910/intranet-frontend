---
description: Migrar un componente CRUD existente al Design System (CSS Variables)
---

# Migrar Componente CRUD al Design System

Este workflow migra un componente existente con estilos hardcodeados al Design System,
permitiendo que herede automáticamente los estilos configurados en `/patrones`.

## Pre-requisitos

- El componente debe tener una tabla CRUD (listado con filtros, paginación)
- El componente debe usar `<app-system-layout>` como wrapper
- El subsistema debe estar registrado en el archivo de rutas

## Pasos

### 1. Identificar el componente a migrar

Recibir del usuario la ruta del componente. Ejemplo:
```
/activos-fijos/bienes-patrimoniales
→ src/app/pages/activos-fijos/bienes-patrimoniales/
```

Archivos involucrados:
- `*.component.ts` — Lógica del componente
- `*.component.html` — Template con la tabla y filtros
- `*.component.scss` — Estilos (donde están los hardcodeados)

### 2. Revisar el SCSS — Eliminar estilos que controla el Design System

// turbo
Buscar en el archivo `.scss` del componente valores hardcodeados de font-size y padding en tablas:

```bash
grep -n "font-size\|padding" <ruta-del-archivo>.component.scss
```

**Eliminar** las siguientes propiedades si están dentro de selectores de tabla (thead, th, td, tbody):
- `font-size: X.Xrem;` — Controlado por `--ds-font-size` y `--ds-header-font-size`
- `padding: Xpx Xpx;` — Controlado por `--ds-cell-padding-y` y `--ds-cell-padding-x`
- `background-color: #XXX;` en `thead` — Controlado por `--ds-table-header-bg`
- `color: #XXX;` en `thead/th` — Controlado por `--ds-table-header-color`

**Conservar** (no eliminar):
- `font-weight` — No controlado por DS
- `vertical-align` — No controlado por DS
- `border-bottom` — No controlado por DS
- `transition` y efectos `:hover` — No controlados por DS
- `font-size` en `.badge`, `.page-link`, u otros elementos NO tabla — Específicos del módulo

### 3. Revisar el TypeScript — Asegurarse de importar correctamente

Verificar que el componente:

a. **Importa** `CrudViewConfig` desde el servicio (NO definirla localmente):
```typescript
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
```

b. **Tiene** la propiedad `cv`:
```typescript
cv!: CrudViewConfig;
```

c. **Manejo de Paginación (CRÍTICO):** 
Inicializar `per_page` y `perPage` con el valor del Design System para evitar desajustes visuales.
> [!IMPORTANT]
> Usar siempre el operador unario `+` al asignar `per_page` desde el filtro para asegurar que sea tratado como número y no como string, lo que rompería los cálculos de índices en la tabla.

```typescript
ngOnInit(): void {
  this.cv = this.dsService.getCrudViewFor('nombre-subsistema');
  // Forzar valor del DS al inicio
  this.filtros.per_page = this.cv.defaultPageSize || 10;
  this.paginacion.perPage = this.cv.defaultPageSize || 10;
  // ... resto de la inicialización
}

onFilterChange(): void {
  this.paginacion.currentPage = 1;
  // Sincronizar perPage como número
  this.paginacion.perPage = +this.filtros.per_page || 10;
  this.loadData();
}
```

d. **Carga de Datos:** En la respuesta del servidor, reasignar siempre el `perPage` real devuelto (o el del filtro como fallback numérico).

```typescript
this.paginacion = {
  // ... otras props
  perPage: +(response.data.per_page || this.filtros.per_page || 10)
};
```

### 4. Migrar el HTML — Reemplazar bindings con clases CSS

#### 4a. Tabla: Reemplazar bindings manuales en `<table>`, `<th>`, `<td>`

**ANTES:**
```html
<table [style.font-size]="cv.fontSize" class="table mb-0 w-100">
  <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
    <th [style.font-size]="cv.headerFontSize" 
        [style.color]="cv.tableHeaderColor"
        [style.padding]="cv.cellPaddingY + ' ' + cv.cellPaddingX">Nombre</th>
  </thead>
  <tbody>
    <td [style.padding]="cv.cellPaddingY + ' ' + cv.cellPaddingX">{{ dato }}</td>
  </tbody>
</table>
```

**DESPUÉS:**
```html
<table [ngClass]="cv.tableClasses" class="table mb-0 w-100 ds-crud-table">
  <thead>
    <th>Nombre</th>    <!-- Sin bindings! Hereda de CSS variables -->
  </thead>
  <tbody>
    <td>{{ dato }}</td>  <!-- Sin bindings! Hereda de CSS variables -->
  </tbody>
</table>
```

**Clave:** Agregar la clase `ds-crud-table` a la tabla y **eliminar** todos los `[style.*]` de `<thead>`, `<th>` y `<td>`.

#### 4b. Labels de filtros: Reemplazar binding con clase

**ANTES:**
```html
<label class="mb-1" [style.font-size]="cv.labelFontSize">Buscar</label>
```

**DESPUÉS:**
```html
<label class="mb-1 ds-crud-label">Buscar</label>
```

#### 4c. Inputs de filtros: Reemplazar binding con clase

**ANTES:**
```html
<input class="form-control form-control-sm" [style.font-size]="cv.filterInputFontSize">
<select class="form-control form-control-sm" [style.font-size]="cv.filterInputFontSize">
```

**DESPUÉS:**
```html
<input class="form-control form-control-sm ds-crud-filter">
<select class="form-control form-control-sm ds-crud-filter">
```

#### 4d. Info de paginación: Usar CSS variable directa

**ANTES:**
```html
<div class="dataTables_info" [style.font-size]="cv.fontSize">
```

**DESPUÉS:**
```html
<div class="dataTables_info" style="font-size: var(--ds-font-size);">
```

#### 4e. Filtros colapsables: Agregar botón y animación

Si no existe, agregar en la toolbar (junto al badge de total):
```html
<button class="btn btn-sm btn-outline-info ml-1 px-2" *ngIf="cv.collapsibleFilters"
  (click)="isFiltersCollapsed = !isFiltersCollapsed"
  [title]="isFiltersCollapsed ? 'Ver filtros' : 'Ocultar filtros'"
  style="height: 24px; line-height: 1;">
  <i class="fas" [ngClass]="isFiltersCollapsed ? 'fa-filter' : 'fa-filter-circle-xmark'"></i>
</button>
```

Y envolver el div de filtros con animación:
```html
<div class="border-bottom bg-light overflow-hidden"
  [style.max-height]="isFiltersCollapsed ? '0px' : '500px'"
  [style.padding]="isFiltersCollapsed ? '0px' : '0.5rem'"
  style="transition: max-height 0.3s ease, padding 0.3s ease;">
  <!-- filtros aquí -->
</div>
```

### 5. Verificar que el `<app-system-layout>` tenga [subsystem]

```html
<app-system-layout [title]="'...'" [subsystem]="'nombre-subsistema'">
```

Esto es lo que activa `applyCrudViewCssVariables()` automáticamente.

### 6. Verificar compilación

// turbo
```bash
# Verificar que no haya errores de compilación
# (el dev server ya está corriendo, solo revisar la terminal)
```

### 7. Verificar visualmente en el navegador

Abrir la ruta del componente en el navegador y verificar que:
- [ ] La tabla muestra los estilos correctos (font-size, padding, colores de header)
- [ ] Los labels tienen el tamaño de letra correcto
- [ ] Los filtros tienen el tamaño de letra correcto
- [ ] El botón de colapso de filtros funciona (si `collapsibleFilters` está habilitado)
- [ ] Los badges de estado usan las clases del DS
- [ ] La paginación usa el tamaño configurado

### Notas

- **Elementos que SIGUEN usando bindings del cv (no migrar a CSS vars):**
  - `[ngClass]="cv.cardOutlineColor"` — Clases dinámicas de card
  - `[ngClass]="cv.excelBtnClass"` — Clases de botones de exportación
  - `[ngClass]="cv.statusActiveClass"` — Clases de badges de estado
  - `cv.showExportButtons` — Visibilidad de botones
  - `cv.collapsibleFilters` — Habilitar colapso
  - Cualquier propiedad que sea una **clase CSS** y no un valor de estilo

- **Clases CSS globales del Design System:**
  - `ds-crud-table` — Aplica font-size, padding, colores de header a toda la tabla
  - `ds-crud-label` — Aplica font-size a labels de filtros
  - `ds-crud-filter` — Aplica font-size a inputs/selects de filtros

## Problemas Comunes (Lessons Learned)

> [!WARNING]
> **El Backend ignora el `per_page`:** 
> Si cambias el selector y la tabla sigue mostrando 20 registros, revisa el controlador en el Backend (Laravel). Muchos controladores tienen `paginate(20)` fijo. Cámbialo por `paginate($request->get('per_page', 10))`.

> [!CAUTION]
> **Error de Renderizado de Índices:**
> Si los números de fila (ej: # 1, 2, 3...) se ven como `101, 102...` en lugar de `11, 12...`, es porque `perPage` se está tratando como String. Asegúrate de usar el prefijo `+` en el TypeScript (+this.filtros.per_page).

> [!TIP]
> **Consistencia en Pestañas:**
> Si un componente tiene pestañas (Tabs), todas las tablas dentro de las pestañas deben usar `ds-crud-table`. No asumas que porque la primera pestaña se ve bien, las demás también lo están. Revisa el HTML completo.
