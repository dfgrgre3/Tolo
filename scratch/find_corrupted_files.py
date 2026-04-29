
import os

def find_corrupted():
    patterns = ['أ¢', 'طآ', 'ظâ', 'يطآ', 'طھ', 'ط§']
    found_files = []
    
    targets = ['src', 'backend', 'scripts', 'public']
    for target in targets:
        abs_target = os.path.join(r'd:\thanawy', target)
        if not os.path.exists(abs_target): continue
        
        for root, dirs, files in os.walk(abs_target):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.json', '.go', '.md', '.sql', '.css', '.html')):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if any(p in content for p in patterns):
                                # Double check: is it real Arabic or mojibake?
                                # If it has 'أ¢â€‌â‚¬' it's definitely mojibake.
                                if 'أ¢â€‌â‚¬' in content or 'طآ§ظâ€' in content:
                                    found_files.append(path)
                                    continue
                                # Check for a high density of these patterns
                                count = sum(content.count(p) for p in patterns)
                                if count > 10:
                                    found_files.append(path)
                    except:
                        pass
    return found_files

if __name__ == "__main__":
    files = find_corrupted()
    for f in files:
        print(f)
