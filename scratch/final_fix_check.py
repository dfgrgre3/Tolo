
import os

def fix_mojibake(text):
    try:
        # Encode as cp1256 to get the original bytes, then decode as utf-8
        return text.encode('cp1256').decode('utf-8')
    except Exception as e:
        return None

# Test string from layout.tsx description
# 'ظ…ظ†طµط© طھط¹ظ„ظٹظ…ظٹط© طھظپط§ط¹ظ„ظٹط©'
test_str = '\u0638\u2026\u0638\u2020\u0637\u00b5\u0637\u00a9 \u0637\u06be\u0637\u00b9\u0638\u201e\u0638\u0679\u0638\u2026\u0638\u0679\u0637\u00a9 \u0637\u06be\u0638\u067e\u0637\u00a7\u0637\u00b9\u0638\u201e\u0638\u0679\u0637\u00a9'

fixed = fix_mojibake(test_str)
print(f"Original: {test_str}")
print(f"Fixed:    {fixed}")

file_path = r'src/app/layout.tsx'
with open(file_path, 'r', encoding='utf-8-sig') as f:
    content = f.read()

fixed_content = ""
lines = content.splitlines()
for i, line in enumerate(lines):
    f = fix_mojibake(line)
    if f:
        fixed_content += f + "\n"
    else:
        fixed_content += line + "\n"

print("\nFirst 20 lines of fixed layout.tsx:")
print("\n".join(fixed_content.splitlines()[:20]))
