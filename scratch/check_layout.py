
import os

def fix_mojibake(text):
    try:
        # The characters we see are actually the bytes of a UTF-8 string
        # but interpreted as CP1252.
        # We need to turn them back into bytes using CP1252 and then decode as UTF-8.
        return text.encode('cp1252').decode('utf-8')
    except Exception:
        return text

file_path = r'src/app/layout.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
for i, line in enumerate(lines):
    if 'description' in line:
        print(f"Line {i+1} Original: {line}")
        print(f"Line {i+1} Fixed:    {fix_mojibake(line)}")
