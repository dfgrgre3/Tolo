import os
import re

def fix_mojibake(text):
    try:
        # 1. Encode as cp1256 (the bytes the characters "should" have been)
        # 2. Decode as utf-8
        return text.encode('cp1256').decode('utf-8')
    except Exception:
        return None

def process_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'ط' not in content and 'ظ' not in content:
            return False

        # Find sequences of characters that could be corrupted Arabic.
        # They usually start with ط, ظ, ک, گ and are followed by characters in the cp1256 range.
        # We can use a regex to find these sequences.
        # Corrupted characters are often: ط, ظ, §, „, ©, …, etc.
        # Let's match any sequence of characters that are in the cp1256 set and NOT common ASCII.
        # But we want to include spaces if they are between corrupted parts.
        
        # A more robust way: Find anything that LOOKS like it could be fixed.
        # We'll use a regex to find potential mojibake candidates.
        # Candidates are sequences of characters that are NOT in the standard Arabic range 
        # but contain many 'ط' and 'ظ'.
        
        pattern = re.compile(r'([طظکگ][\u0080-\u02FF\u0600-\u06FF\u2000-\u20FF]*)')
        
        def replace_func(match):
            candidate = match.group(1)
            # Try to fix the candidate. If it fails, try shortening it from the end.
            for i in range(len(candidate), 0, -1):
                fixed = fix_mojibake(candidate[:i])
                if fixed and any('\u0600' <= c <= '\u06FF' for c in fixed):
                    return fixed + candidate[i:]
            return candidate

        new_content = pattern.sub(replace_func, content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return False

targets = ['src', 'scripts', 'backend', 'public']
for target in targets:
    abs_target = os.path.join(r'd:\thanawy', target)
    if not os.path.exists(abs_target):
        continue
    for root, dirs, files in os.walk(abs_target):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.json', '.go', '.md', '.sql')):
                path = os.path.join(root, file)
                if process_file(path):
                    print(f"Fixed: {path}")
