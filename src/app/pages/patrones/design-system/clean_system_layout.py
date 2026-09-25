import sys

filepath = r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove System Layout Config from left column
start_sys = content.find('<hr class="my-3">\\n            <h6 class="text-muted mb-2"><i class="fas fa-layer-group mr-1"></i> System Layout Generales</h6>')
if start_sys != -1:
    end_sys = content.find('</div>\\n\\n          </div>\\n\\n          <!-- Vista Previa (Derecha) -->', start_sys)
    if end_sys != -1:
        content = content[:start_sys] + content[end_sys:]

# Strip systemLayout from the preview bindings
content = content.replace('[style.color]="config.systemLayout.textColor"', 'style="color: #333;"')
content = content.replace('[style.font-family]="config.systemLayout.fontFamily"', 'style="font-family: inherit;"')
content = content.replace('[style.color]="config.systemLayout.headingColor"', 'style="color: #111;"')
content = content.replace('[style.box-shadow]="config.systemLayout.boxShadow"', 'style="box-shadow: 0 0 1px rgba(0,0,0,.125),0 1px 3px rgba(0,0,0,.2);"')
content = content.replace('[style.border-radius.px]="config.systemLayout.borderRadius"', 'style="border-radius: 4px;"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
