import sys

def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find boundaries
    start_idx = content.find("<!-- 5: VISTA CRUD LISTA -->")
    if start_idx == -1: return

    # We only operate on the part of the file after the crudList tab
    prefix = content[:start_idx]
    crud_part = content[start_idx:]
    
    # 1. Remove the edit toggle button
    toggle_str = r'''        <button class="btn btn-tool" (click)="toggleEdit('crudView')">
          <i [class]="isEditing('crudView') ? 'fas fa-times' : 'fas fa-edit'"></i>
        </button>'''
    crud_part = crud_part.replace(toggle_str, "")
    
    # 2. Extract the editor block
    editor_start = "<!-- Modo edición -->\n        <div *ngIf=\"isEditing('crudView')\">"
    editor_end = "        <!-- Vista resumen (no editing) -->"
    
    e_start_idx = crud_part.find(editor_start)
    e_end_idx = crud_part.find(editor_end)
    
    # The actual editor block ending div is just before the vista resumen
    # Let's cleanly grab it
    editor_block = crud_part[e_start_idx : e_end_idx]
    
    # Let's clean up the wrapper and change col-md-4 to col-12 mb-4
    editor_inner = editor_block.replace("<!-- Modo edición -->\n        <div *ngIf=\"isEditing('crudView')\">\n          <div class=\"row\">", "")
    # and the last </div></div>
    editor_inner = editor_inner.rsplit("</div>\n        </div>", 1)[0]
    
    # Replace columns
    editor_inner = editor_inner.replace("class=\"col-md-4\"", "class=\"col-12 mb-4\"")
    
    # 3. Extract the preview block
    preview_start = "<!-- Live Preview: Card Outlined (contenedor de tablas CRUD) -->"
    preview_end = "<!-- Modo edición -->"
    
    p_start_idx = crud_part.find(preview_start)
    p_end_idx = crud_part.find(preview_end)
    
    preview_block = crud_part[p_start_idx : p_end_idx].strip()
    
    # 4. Remove the vista resumen block
    summary_end_idx = crud_part.find('</div>\n\n      </div>\n    </div>\n\n  </div>')
    # wait, the exact end might vary.
    
    # The card-body py-3 starts right before the preview block:
    card_body_str = "<div class=\"card-body py-3\">"
    cb_start = crud_part.find(card_body_str)
    
    # We will reconstruct from cb_start
    new_cb = card_body_str + "\n        <div class=\"row\">\n\n          <!-- Modo Edición (Izquierda) -->\n          <div class=\"col-xl-5 col-lg-6 pr-lg-4\" style=\"max-height: 800px; overflow-y: auto;\">\n            <h6 class=\"text-primary font-weight-bold mb-3\"><i class=\"fas fa-sliders-h mr-1\"></i> Controles de Diseño</h6>\n"
    new_cb += editor_inner + "\n          </div> <!-- Cierra col-xl-5 -->\n\n"
    
    new_cb += "          <!-- Vista Previa (Derecha) -->\n          <div class=\"col-xl-7 col-lg-6\">\n            <div class=\"sticky-top ds-preview-sticky\" style=\"top: 15px; z-index: 10;\">\n              <h6 class=\"text-primary font-weight-bold mb-3\"><i class=\"fas fa-eye mr-1\"></i> Vista Previa en Tiempo Real</h6>\n              "
    new_cb += preview_block + "\n            </div>\n          </div> <!-- Cierra col-xl-7 -->\n\n        </div> <!-- Cierra row -->\n      </div>\n    </div>\n  </div>"
    
    # the end of file was:
    final = prefix + crud_part[:cb_start] + new_cb
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(final)

process(r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html")
