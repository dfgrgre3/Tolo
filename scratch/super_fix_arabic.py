
import os
import re

def try_fix(text):
    if not text: return text
    
    # Try multiple layers of fixing
    current = text
    for _ in range(3): # Up to 3 layers of mojibake
        try:
            # The most common pattern: UTF-8 bytes read as CP1252 and saved as UTF-8
            candidate = current.encode('cp1252').decode('utf-8')
            if candidate != current:
                current = candidate
                continue
        except: pass
        
        try:
            # Another pattern: UTF-8 bytes read as CP1256 and saved as UTF-8
            candidate = current.encode('cp1256').decode('utf-8')
            if candidate != current:
                current = candidate
                continue
        except: pass

        try:
            # Another pattern: Read as Latin-1
            candidate = current.encode('latin-1').decode('utf-8')
            if candidate != current:
                current = candidate
                continue
        except: pass
        
        break
        
    return current

def is_corrupted(text):
    # Heuristic: contains weird combinations of Arabic and Latin/Symbols
    # especially patterns like أ¢, طآ, ظâ
    patterns = ['أ¢', 'طآ', 'ظâ', 'يطآ', 'طھ', 'ط§', 'ظâ€']
    for p in patterns:
        if p in text: return True
    return False

def process_file(path):
    try:
        with open(path, 'rb') as f:
            raw = f.read()
        
        # Try to decode as UTF-8
        try:
            content = raw.decode('utf-8')
        except UnicodeDecodeError:
            # If not UTF-8, try CP1256
            try:
                content = raw.decode('cp1256')
                # If it's CP1256, we definitely want to convert it to UTF-8
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            except:
                return False
        
        if not is_corrupted(content):
            return False
            
        # Fix line by line or use regex to find strings
        # Fixing the whole file might be risky if there are intentional weird characters.
        # But usually in these files, it's all mojibake.
        
        fixed_content = try_fix(content)
        
        if fixed_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
            
    except Exception as e:
        print(f"Error processing {path}: {e}")
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
