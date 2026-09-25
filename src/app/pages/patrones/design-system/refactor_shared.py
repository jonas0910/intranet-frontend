import sys, re
filepath = r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("<!-- 3: Shared Components -->")
end_idx = content.find("<!-- 4 & 5: Modals and CRUD -->")
shared = content[start_idx:end_idx]

# split by h6 class="text-muted mb-2" (which opens each section)
parts = re.split(r'<!-- ===== 3[a-z]\. ', shared)
print("Sections found:", len(parts)-1)

left_col = '<div class="col-xl-5 col-lg-6 pr-lg-4" style="max-height: 800px; overflow-y: auto;">\n'
right_col = '<div class="col-xl-7 col-lg-6">\n<div class="sticky-top ds-preview-sticky" style="top: 15px; z-index: 10;">\n'

new_shared = shared[:shared.find('<div class="card-body py-3">')+len('<div class="card-body py-3">')]
new_shared = new_shared.replace('        <button class="btn btn-tool" (click)="toggleEdit(\'shared\')">\n          <i [class]="isEditing(\'shared\') ? \'fas fa-times\' : \'fas fa-edit\'"></i>\n        </button>', '')

new_shared += '\n<div class="row">\n'

for p in parts[1:]:
    # p is something like Page Header ===== -->\n <h6 class="text-muted...
    name_end = p.find(" =====")
    sec_name = p[:name_end].strip()
    
    p = p[name_end + 13:] # skip ===== -->\n
    
    # an editor block starts with <div *ngIf="isEditing('shared')"
    # it ends with the closing div of that block.
    # The preview block is everything after the editor block until the end of this part.
    
    # We remove *ngIf="isEditing('shared')"
    p = p.replace('*ngIf="isEditing(\'shared\')" ', '')
    
    # We can just inject the header in both cols, or only editor on left, preview on right.
    # But usually <h6 class="text-muted mb-2"><i class="fas fa-heading mr-1"></i> Page Header</h6>
    # is the first line of p.
    h6_end = p.find('</h6>') + 5
    header = p[:h6_end]
    p_body = p[h6_end:]
    
    # Inside p_body, the editor is the first child (a <div class="border rounded p-2 mb-2 bg-white">)
    # The way to split it is matching the closing div of the row.
    # But actually, finding the preview is easier: "<!-- " something " Preview -->" or just looking at the <div class="border rounded p-2 mb-3...
    
    # Let's just put the entire p_body into left and right? No, we must split editor vs preview.
    
    editor_start = p_body.find('<div class="border rounded')
    # Editor ends where the next top-level div starts
    # Since it's <div class="border rounded...><div class="row">...</div></div>
    
    # Since parsing HTML is annoying, let's just use BS4 if available or a stack based div matcher.
    
    div_stack = []
    idx = editor_start
    first_div_found = False
    
    while idx < len(p_body):
        if p_body[idx:idx+4] == '<div':
            div_stack.append('<div')
            first_div_found = True
        elif p_body[idx:idx+6] == '</div>':
            if div_stack:
                div_stack.pop()
                if len(div_stack) == 0 and first_div_found:
                    idx += 6
                    break
        idx += 1
        
    editor_content = p_body[editor_start:idx]
    preview_content = p_body[idx:].strip()
    
    left_col += header + '\n' + editor_content + '\n'
    right_col += header.replace('text-muted mb-2', 'text-primary font-weight-bold mb-3') + '\n' + preview_content + '\n'

left_col += '</div>\n'
right_col += '</div>\n</div>\n'

new_shared += left_col + right_col + '</div>\n      </div>\n    </div>\n  </div>\n\n  '

final_html = content[:start_idx] + new_shared + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_html)
print("Shared tabs transformed!")
