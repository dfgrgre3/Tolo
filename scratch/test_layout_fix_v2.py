
import os

def fix_mojibake_string(s):
    try:
        # Remove BOM if present before conversion
        if s.startswith('\ufeff'):
            prefix = '\ufeff'
            s = s[1:]
        else:
            prefix = ''
            
        # Try to fix
        return prefix + s.encode('cp1256').decode('utf-8')
    except Exception:
        return s

def test_fix(file_path):
    try:
        # Use utf-8-sig to automatically handle BOM when reading
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        # We process line by line or the whole thing.
        # Line by line is safer to avoid one bad line breaking everything.
        fixed_lines = []
        for line in content.splitlines():
            try:
                # If the line contains characters typical of mojibake (ظ or ط followed by others)
                if any(c in line for c in 'ظط'):
                    fixed_lines.append(line.encode('cp1256').decode('utf-8'))
                else:
                    fixed_lines.append(line)
            except:
                fixed_lines.append(line)
        
        fixed_content = '\n'.join(fixed_lines)
        
        print("Original samples (lines 15-18):")
        lines = content.splitlines()
        for i in range(min(14, len(lines)), min(18, len(lines))):
            print(f"  {lines[i]}")
            
        print("\nFixed samples (lines 15-18):")
        fixed_lines_list = fixed_content.splitlines()
        for i in range(min(14, len(fixed_lines_list)), min(18, len(fixed_lines_list))):
            print(f"  {fixed_lines_list[i]}")
            
    except Exception as e:
        print(f"Error: {e}")

test_fix(r'src/app/layout.tsx')
