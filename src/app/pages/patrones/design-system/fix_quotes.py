import sys

filepath = r"d:\py\intra\intranet-frontend\src\app\pages\patrones\design-system\design-system.component.html"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('""1rem""', "'1rem'")
content = content.replace('""#007bff""', "'#007bff'")
content = content.replace('""1px solid #ccc""', "'1px solid #ccc'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
