import sys

filepath = r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix replacements
content = content.replace('config.systemLayout.fontSize', '"1rem"')
content = content.replace('config.systemLayout.linkColor', '"#007bff"')
content = content.replace('config.systemLayout.borderStyle', '"1px solid #ccc"')
content = content.replace('config.systemLayout.cardBoxShadow', 'config.systemLayout.boxShadow')
content = content.replace('config.systemLayout.inputBorderRadius', 'config.systemLayout.borderRadius')
content = content.replace('config.systemLayout.buttonBorderRadius', 'config.systemLayout.borderRadius')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed layout template binding errors!")
