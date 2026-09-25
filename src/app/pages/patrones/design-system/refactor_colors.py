import sys

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    start_idx = content.find("<!-- 1 & 2: Colors and Buttons -->")
    end_idx = content.find("<!-- 3: Shared Components -->")
    
    if start_idx == -1 or end_idx == -1: return
    
    prefix = content[:start_idx]
    suffix = content[end_idx:]
    
    replacement = '''<!-- 1 & 2: Colors and Buttons -->
  <div *ngIf="activeDesignTab === 'colors'">
    <div class="card elevation-1 mb-3"
      [ngClass]="config.crudView.cardOutlineColor ? \'card-outline \' + config.crudView.cardOutlineColor : \'card-outline card-primary\'"
      [style.border-radius.px]="config.crudView.cardBorderRadius">
      <div class="card-header py-2 d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0"><i class="fas fa-palette mr-2 text-primary"></i> 2. Colores y Botones</h3>
      </div>
      <div class="card-body py-3">
        <div class="row">

          <!-- Modo Edición (Izquierda) -->
          <div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">
            <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-sliders-h mr-1"></i> Controles de Diseño</h6>
            
            <h6 class="text-muted mb-2"><i class="fas fa-palette mr-1"></i> Paleta de Colores</h6>
            <div class="ds-edit-row" *ngFor="let c of config.colors; let i = index">
              <div class="ds-edit-color-preview" [style.background-color]="c.hex"></div>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="c.name" placeholder="Nombre" style="max-width: 120px;">
              <input type="color" class="form-control form-control-sm ds-color-picker" [(ngModel)]="c.hex" title="Color">
              <input type="text" class="form-control form-control-sm" [(ngModel)]="c.hex" placeholder="#hex" style="max-width: 90px;">
              <select class="form-control form-control-sm" [(ngModel)]="c.textClass" style="max-width: 110px;">
                <option value="text-white">Blanco</option>
                <option value="text-dark">Oscuro</option>
              </select>
              <button class="btn btn-outline-danger btn-sm" (click)="removeColor(i)" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </div>
            <button class="btn btn-outline-primary btn-sm mt-2 mb-4" (click)="addColor()">
              <i class="fas fa-plus mr-1"></i> Agregar Color
            </button>

            <h6 class="text-muted mb-2"><i class="fas fa-mouse-pointer mr-1"></i> Botones Estándar</h6>
            <div class="ds-btn-group-edit mb-3" *ngFor="let grp of config.buttonGroups; let gi = index">
              <div class="d-flex align-items-center mb-2">
                <input type="text" class="form-control form-control-sm" [(ngModel)]="grp.label" style="max-width: 200px;">
                <button class="btn btn-outline-danger btn-sm ml-2" (click)="removeButtonGroup(gi)" title="Eliminar grupo"><i class="fas fa-trash-alt"></i></button>
              </div>
              <div class="ds-edit-row" *ngFor="let btn of grp.buttons; let bi = index">
                <button class="btn btn-sm" [ngClass]="btn.cssClass" style="min-width: 80px;"><i [class]="btn.icon"></i></button>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="btn.label" placeholder="Label" style="max-width: 90px;">
                <input type="text" class="form-control form-control-sm" [(ngModel)]="btn.icon" placeholder="fas fa-..." style="max-width: 110px;">
                <select class="form-control form-control-sm" [(ngModel)]="btn.cssClass" style="max-width: 130px;">
                  <option *ngFor="let cls of btnClassList" [value]="cls">{{ cls }}</option>
                </select>
                <button class="btn btn-outline-danger btn-sm" (click)="removeButton(gi, bi)"><i class="fas fa-trash-alt"></i></button>
              </div>
              <button class="btn btn-outline-primary btn-sm mt-1" (click)="addButton(gi)"><i class="fas fa-plus mr-1"></i> Botón</button>
            </div>
            <button class="btn btn-outline-success btn-sm mb-3" (click)="addButtonGroup()">
              <i class="fas fa-layer-group mr-1"></i> Agregar Grupo
            </button>
          </div>

          <!-- Vista Previa (Derecha) -->
          <div class="col-xl-7 col-lg-6">
            <div class="sticky-top ds-preview-sticky" style="top: 15px; z-index: 10;">
              <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-eye mr-1"></i> Vista Previa</h6>
              
              <h6 class="text-muted font-weight-bold">Colores</h6>
              <div class="row text-center mb-4 border rounded p-3 bg-light m-0">
                <div class="col-md-3 col-sm-4 mb-3" *ngFor="let c of config.colors">
                  <div class="p-3 mb-2 rounded shadow-sm" [style.background-color]="c.hex" [class]="c.textClass">
                    {{ c.name }}
                  </div>
                  <code>{{ c.hex }}</code>
                </div>
              </div>

              <h6 class="text-muted font-weight-bold">Botones</h6>
              <div class="mb-3 p-3 bg-light border rounded m-0">
                <div class="mb-3" *ngFor="let grp of config.buttonGroups">
                  <h6 class="text-muted mb-2 font-weight-bold">{{ grp.label }}</h6>
                  <button *ngFor="let btn of grp.buttons" class="btn btn-sm mr-2 mb-1 shadow-sm" [ngClass]="btn.cssClass">
                    <i [class]="btn.icon + \' mr-1\'"></i> {{ btn.label }}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>\n\n  '''
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(prefix + replacement + suffix)

process(r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html")
