import sys

def build_layout_tab():
    return '''
  <!-- 1: Layout -->
  <div *ngIf="activeDesignTab === 'layout'">
    <div class="card elevation-1 mb-3" [ngClass]="config.crudView.cardOutlineColor ? 'card-outline ' + config.crudView.cardOutlineColor : 'card-outline card-primary'" [style.border-radius.px]="config.crudView.cardBorderRadius">
      <div class="card-header py-2 d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0"><i class="fas fa-columns mr-2 text-primary"></i> 1. Layout y Estructura</h3>
      </div>
      <div class="card-body py-3">
        <div class="row">
          
          <!-- Modo Edición (Izquierda) -->
          <div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">
            <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-sliders-h mr-1"></i> Controles de Diseño</h6>
            
            <h6 class="text-muted mb-2"><i class="fas fa-paint-roller mr-1"></i> Colores Generales (Layout)</h6>
            <div class="row">
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Sidebar Bg</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.sidebarBg"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.sidebarBg"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Navbar Bg</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.navbarBg"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.navbarBg"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Brand Bg</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.brandBg"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.brandBg"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Content Bg</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.contentBg"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.contentBg"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Sidebar Text</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.sidebarText"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.sidebarText"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Sidebar Active</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.layout.sidebarActiveText"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.sidebarActiveText"></div>
              </div>
            </div>

            <hr class="my-3">
            <h6 class="text-muted mb-2"><i class="fas fa-sitemap mr-1"></i> Líneas de Árbol (Menú)</h6>
            <div class="row">
              <div class="col-12 mb-2">
                <div class="custom-control custom-switch">
                  <input type="checkbox" class="custom-control-input" id="showTree" [(ngModel)]="config.layout.showTreeLines">
                  <label class="custom-control-label small" for="showTree">Mostrar Líneas Conectoras</label>
                </div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Color de Línea</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="config.layout.treeLineColor">
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Largo de rama (px)</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="config.layout.treeBranchLength">
              </div>
            </div>

            <hr class="my-3">
            <h6 class="text-muted mb-2"><i class="fas fa-layer-group mr-1"></i> System Layout Generales</h6>
            <div class="row">
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Font Family</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.fontFamily">
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Font Size (Base)</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.fontSize">
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Text Color</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.systemLayout.textColor"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.textColor"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Heading Color</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.systemLayout.headingColor"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.headingColor"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Link Color</label>
                <div class="d-flex"><input type="color" class="form-control form-control-sm border-0 p-0 mr-1" style="width: 30px;" [(ngModel)]="config.systemLayout.linkColor"><input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.linkColor"></div>
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Border Style</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.borderStyle">
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Input Radius (px)</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.inputBorderRadius">
              </div>
              <div class="col-sm-6 mb-2">
                <label class="small text-muted mb-1">Button Radius (px)</label>
                <input type="number" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.buttonBorderRadius">
              </div>
              <div class="col-12 mb-2">
                <label class="small text-muted mb-1">Card Box Shadow</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="config.systemLayout.cardBoxShadow">
              </div>
            </div>

          </div>

          <!-- Vista Previa (Derecha) -->
          <div class="col-xl-7 col-lg-6">
            <div class="sticky-top ds-preview-sticky bg-white p-3 border rounded shadow-sm" style="top: 15px; z-index: 10;">
              <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-eye mr-1"></i> Vista Previa en Tiempo Real</h6>
              
              <div class="ds-live-layout-preview" style="height: 400px; display: flex; flex-direction: column; border: 1px solid #ddd; overflow: hidden; border-radius: 8px;">
                <!-- Navbar -->
                <div class="ds-nav" [style.background-color]="config.layout.navbarBg" [style.height.px]="config.layout.navbarHeight" style="display: flex; align-items: center; padding: 0 15px;">
                  <i class="fas fa-bars" [style.color]="config.layout.navbarText"></i>
                  <span class="ml-3 font-weight-bold" [style.color]="config.layout.navbarText">Intranet</span>
                </div>
                
                <div style="display: flex; flex: 1; overflow: hidden;">
                  <!-- Sidebar -->
                  <div class="ds-side" [style.background-color]="config.layout.sidebarBg" [style.width.px]="config.layout.sidebarWidth" style="display: flex; flex-direction: column;">
                    <div [style.background-color]="config.layout.brandBg" style="padding: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                      <i class="fas fa-shield-alt" [style.color]="config.layout.brandText"></i> <span [style.color]="config.layout.brandText">Notaria</span>
                    </div>
                    <div style="padding: 15px 0;">
                      <div style="padding: 8px 15px;" [style.color]="config.layout.sidebarActiveText"><i class="fas fa-home mr-2"></i> Inicio</div>
                      <div style="padding: 8px 15px;" [style.color]="config.layout.sidebarText"><i class="fas fa-users mr-2"></i> Usuarios</div>
                      <div style="padding: 8px 15px;" [style.color]="config.layout.sidebarText"><i class="fas fa-cog mr-2"></i> Configuración</div>
                    </div>
                  </div>
                  
                  <!-- Content -->
                  <div class="ds-content" [style.background-color]="config.layout.contentBg" [style.color]="config.systemLayout.textColor" [style.font-family]="config.systemLayout.fontFamily" style="flex: 1; padding: 20px; overflow-y: auto;">
                    <h4 [style.color]="config.systemLayout.headingColor" [style.font-size]="config.systemLayout.fontSize">Bienvenido al Panel</h4>
                    <p style="opacity: 0.8;">Este es un texto de ejemplo con la tipografía seleccionada. <a href="javascript:void(0)" [style.color]="config.systemLayout.linkColor">Enlace de prueba</a></p>
                    
                    <div class="card" [style.box-shadow]="config.systemLayout.cardBoxShadow" [style.border]="config.systemLayout.borderStyle">
                      <div class="card-body">
                        Contenido de tarjeta. Muestra el estilo de los bordes y las sombras configuradas de manera general.
                        <div class="mt-3">
                          <input type="text" class="form-control form-control-sm mb-2" placeholder="Input de prueba" [style.border-radius.px]="config.systemLayout.inputBorderRadius">
                          <button class="btn btn-primary btn-sm" [style.border-radius.px]="config.systemLayout.buttonBorderRadius">Botón Pila</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
  '''

with open(r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html", 'r', encoding='utf-8') as f:
    orig = f.read()

# I will find the <!-- 1 & 2: Colors and Buttons --> and inject layout right before it!
col_idx = orig.find("<!-- 1 & 2: Colors and Buttons -->")
if col_idx != -1:
    orig = orig[:col_idx] + build_layout_tab() + orig[col_idx:]
    with open(r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html", 'w', encoding='utf-8') as f:
        f.write(orig)
    print("Injected Layout smoothly.")
else:
    print("Could not find Colors tag.")

