import sys

def build_tabs():
    return '''
  <!-- 3: Shared -->
  <div *ngIf="activeDesignTab === 'shared'">
    <div class="card elevation-1 mb-3">
      <div class="card-header py-2 d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0"><i class="fas fa-puzzle-piece mr-2 text-primary"></i> 3. Componentes Compartidos</h3>
      </div>
      <div class="card-body py-3">
        <div class="row">
          <div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">
            <p class="text-muted small">Esta sección se encuentra temporalmente en mantenimiento o en simplificación.</p>
          </div>
          <div class="col-xl-7 col-lg-6">
            <div class="sticky-top ds-preview-sticky" style="top: 15px; z-index: 10;">
              <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-eye mr-1"></i> Vista Previa</h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 4: CRUD -->
  <div *ngIf="activeDesignTab === 'crud'">
    <div class="card elevation-1 mb-3">
      <div class="card-header py-2 d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0"><i class="fas fa-edit mr-2 text-primary"></i> 4. Modales y Formularios</h3>
      </div>
      <div class="card-body py-3">
        <div class="row">
          <div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">
             <p class="text-muted small">Esta sección se encuentra temporalmente en mantenimiento.</p>
          </div>
          <div class="col-xl-7 col-lg-6">
            <div class="sticky-top ds-preview-sticky" style="top: 15px; z-index: 10;">
              <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-eye mr-1"></i> Vista Previa en Tiempo Real</h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 5: CRUD List -->
  <div *ngIf="activeDesignTab === 'crudList'">
    <div class="card elevation-1 mb-3">
      <div class="card-header py-2 d-flex justify-content-between align-items-center">
        <h3 class="card-title mb-0"><i class="fas fa-table mr-2 text-primary"></i> 5. Listados y Tablas</h3>
      </div>
      <div class="card-body py-3">
        <div class="row">
          <div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">
             <p class="text-muted small">Esta sección se encuentra temporalmente en mantenimiento.</p>
          </div>
          <div class="col-xl-7 col-lg-6">
            <div class="sticky-top ds-preview-sticky" style="top: 15px; z-index: 10;">
              <h6 class="text-primary font-weight-bold mb-3"><i class="fas fa-eye mr-1"></i> Vista Previa en Tiempo Real</h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  '''

filepath = r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html"
with open(filepath, 'r', encoding='utf-8') as f:
    orig = f.read()

# Replace the stray '>' at the very end
orig = orig.rstrip()
if orig.endswith('>'):
    orig = orig[:-1].rstrip()

# Now we must make sure we don't duplicate closing tags.
# "orig" currently ends with:
#  <!-- 3: Shared Components -->
#  ...
#  </div>
#  </div>
#  </div>
# But actually the container-fluid ends at the very end.
# So I will just append the missing tabs, and then </div> for container-fluid
orig = orig + build_tabs()
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(orig)
print("Injected dummy tabs smoothly.")

