import os
import re

def fix_mojibake(text):
    try:
        # The corruption happened by:
        # 1. Original UTF-8 bytes were interpreted as Windows-1256 (cp1256)
        # 2. Resulting characters were saved back as UTF-8
        # To fix:
        # 1. Encode the current string as cp1256 to get the original bytes
        # 2. Decode those bytes as UTF-8
        return text.encode('cp1256').decode('utf-8')
    except Exception:
        return text

def process_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We want to find sequences of characters that look like corrupted Arabic
        # These are usually characters in the range of Windows-1256 mapped from Arabic UTF-8
        # Most of them start with ط (D8) or ظ (D9) or ک (DA) or گ (DB)
        # But they can also be other characters from the cp1256 set.
        
        # Instead of regex, let's try to fix everything that CAN be fixed
        # But we should be careful not to corrupt valid text.
        # Valid Arabic text will FAIL encode('cp1256').decode('utf-8') if it's already UTF-8?
        # Actually, if it's valid Arabic (e.g. 'ا'), it's U+0627.
        # U+0627 is NOT in Windows-1256? Let's check.
        # In cp1256, 0xC7 is ا.
        # So 'ا' (U+0627).encode('cp1256') -> b'\xc7'.
        # b'\xc7'.decode('utf-8') -> Fails (invalid start byte).
        
        # So the fix_mojibake function is actually quite safe!
        # It will only work if the bytes formed by cp1256 encoding are valid UTF-8.
        
        # However, we don't want to process the whole file at once if it's huge or has mixed content.
        # But Next.js files and JSON files are usually manageable.
        
        # Let's try to find potential mojibake strings.
        # They usually contain characters like ط, ظ, §, „, etc.
        
        # A better approach: search for strings in quotes and try to fix them.
        
        def replacement(match):
            original = match.group(0)
            fixed = fix_mojibake(original)
            return fixed

        # Let's try to fix the whole content if it has corruption.
        # We can detect corruption by looking for common patterns like ط§ or ظ„
        if 'ط§' in content or 'ظ„' in content or 'طھ' in content:
            # We'll use a more surgical approach to avoid destroying valid non-Arabic text
            # but for now let's see if we can just fix the whole thing.
            
            # Actually, let's find all strings that look like corrupted Arabic.
            # Corrupted Arabic characters are mostly in the range \u0080-\u00FF and some specific others.
            # But they are presented as characters like 'ط' (U+0637).
            
            # Let's use the logic: if a sequence of characters can be decoded this way, do it.
            # We'll use a regex to find sequences of cp1256 characters that would form valid UTF-8.
            
            new_content = ""
            i = 0
            while i < len(content):
                # Try to find the longest sequence starting at i that can be fixed
                found = False
                for j in range(len(content), i, -1):
                    chunk = content[i:j]
                    if any(c in chunk for c in 'طظٹ'): # Heuristic: must contain common corrupted chars
                        try:
                            fixed = chunk.encode('cp1256').decode('utf-8')
                            if fixed != chunk and any('\u0600' <= c <= '\u06FF' for c in fixed):
                                new_content += fixed
                                i = j
                                found = True
                                break
                        except Exception:
                            pass
                if not found:
                    new_content += content[i]
                    i += 1
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return False

# Target directories
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
