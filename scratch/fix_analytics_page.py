
import os

def fix_content(content):
    # Mapping of mojibake sequences to correct Arabic characters
    mapping = {
        'أ¢â€‌â‚¬': '───',
        'أ¢â‚¬â€‌': '—',
        'غيطآ±': 'غير',
        'يطآ©': 'ية',
        'يطآ±': 'ير',
        'طآ§': 'ا',
        'ظâ€‍': 'ل',
        'طھ': 'ت',
        'طآ­': 'ح',
        'ظâ€¦': 'م',
        'يطآ': 'ي',
        'طآ¯': 'د',
        'طآ«': 'ث',
        'طآ®': 'خ',
        'طآ·': 'ط',
        'طآ£': 'أ',
        'ظâ€ ': 'ن',
        'طآ¬': 'ج',
        'طآ¨': 'ب',
        'طآ¥': 'إ',
        'طآ¹': 'ع',
        'ظث†': 'و',
        'طآ©': 'ة',
        'ظئ’': 'ك',
        'ظâ€ڑ': 'ق',
        'طآ±': 'ر',
        'طآ´': 'ش',
        'طآ²': 'ز',
        'طآµ': 'ص',
        'طآ¶': 'ض',
        'طآ؛': 'غ',
        'ظâ€': 'ف',
        'طآ°': 'ذ',
        'طآ»': '؛',
        'طآ؟': '؟',
        'ظâ‚¬': 'ـ',
        'أâ‚¬': '—',
        'أ¢â‚¬': '—',
    }
    
    for k in sorted(mapping.keys(), key=len, reverse=True):
        content = content.replace(k, mapping[k])
    
    # Direct symbol replacement for leftovers
    cleanup = {
        '©': 'ة',
        '±': 'ر',
        '´': 'ش',
        'µ': 'ص',
        '¶': 'ض',
        '¹': 'س',
        'º': 'ص',
        '»': '؛',
        '¼': 'ئ',
        '½': 'ء',
        '¾': 'ؤ',
        '¿': '؟',
        '§': 'ا',
        '¨': 'ب',
        '©': 'ة',
        'ª': 'ت',
        '«': 'ث',
        '¬': 'ج',
        '®': 'خ',
        '¯': 'د',
        '°': 'ذ',
        '²': 'ز',
        '³': 'س',
        '·': 'ط',
        '¹': 'س',
        'º': 'ص',
        '»': '؛',
        '¼': 'ئ',
        '½': 'ء',
        '¾': 'ؤ',
        '¿': '؟',
        'آ': '', # Final removal of آ
        'ظف': 'ف',
        'ظ…': 'م',
        'ظ†': 'ن',
        'ط­': 'ح',
    }
    for k, v in cleanup.items():
        content = content.replace(k, v)

    return content

def main():
    path = r'd:\thanawy\src\app\(admin)\admin\courses\[id]\analytics\page.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed = fix_content(content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(fixed)
    print("Fixed analytics/page.tsx")

if __name__ == "__main__":
    main()
