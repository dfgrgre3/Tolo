
import os

def fix_content(content):
    mapping = {
        'أ¢â€‌â‚¬': '───', 'أ¢â‚¬â€‌': '—', 'غيطآ±': 'غير', 'يطآ©': 'ية', 'يطآ±': 'ير',
        'طآ§': 'ا', 'ظâ€‍': 'ل', 'طھ': 'ت', 'طآ­': 'ح', 'ظâ€¦': 'م', 'يطآ': 'ي',
        'طآ¯': 'د', 'طآ«': 'ث', 'طآ®': 'خ', 'طآ·': 'ط', 'طآ£': 'أ', 'ظâ€ ': 'ن',
        'طآ¬': 'ج', 'طآ¨': 'ب', 'طآ¥': 'إ', 'طآ¹': 'ع', 'ظث†': 'و', 'طآ©': 'ة',
        'ظئ’': 'ك', 'ظâ€ڑ': 'ق', 'طآ±': 'ر', 'طآ´': 'ش', 'طآ²': 'ز', 'طآµ': 'ص',
        'طآ¶': 'ض', 'طآ؛': 'غ', 'ظâ€': 'ف', 'طآ°': 'ذ', 'طآ»': '؛', 'طآ؟': '؟',
        'ظâ‚¬': 'ـ', 'أâ‚¬': '—', 'أ¢â‚¬': '—'
    }
    for k in sorted(mapping.keys(), key=len, reverse=True):
        content = content.replace(k, mapping[k])
    cleanup = {
        '©': 'ة', '±': 'ر', '´': 'ش', 'µ': 'ص', '¶': 'ض', '¹': 'س', 'º': 'ص',
        '»': '؛', '¼': 'ئ', '½': 'ء', '¾': 'ؤ', '¿': '؟', '§': 'ا', '¨': 'ب',
        'ª': 'ت', '«': 'ث', '¬': 'ج', '®': 'خ', '¯': 'د', '°': 'ذ', '²': 'ز',
        '³': 'س', '·': 'ط', 'آ': '', 'ظف': 'ف', 'ظ…': 'م', 'ظ†': 'ن', 'ط­': 'ح'
    }
    for k, v in cleanup.items():
        content = content.replace(k, v)
    return content

def process_file(path):
    try:
        with open(path, 'rb') as f:
            raw = f.read()
        
        # Check if it's UTF-8
        try:
            content = raw.decode('utf-8')
        except UnicodeDecodeError:
            # Try CP1256 if not UTF-8
            try:
                content = raw.decode('cp1256')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            except: return False
            
        # Check for mojibake patterns
        if 'طآ' in content or 'ظâ' in content or 'أ¢â' in content:
            fixed = fix_content(content)
            if fixed != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                return True
    except: pass
    return False

def main():
    targets = ['src', 'backend', 'scripts', 'public']
    fixed_count = 0
    for target in targets:
        abs_target = os.path.join(r'd:\thanawy', target)
        if not os.path.exists(abs_target): continue
        for root, dirs, files in os.walk(abs_target):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.json', '.go', '.md', '.sql', '.css', '.html')):
                    path = os.path.join(root, file)
                    if process_file(path):
                        print(f"Fixed: {path}")
                        fixed_count += 1
    print(f"Total files fixed: {fixed_count}")

if __name__ == "__main__":
    main()
