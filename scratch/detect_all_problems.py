
import os

def detect_problems(file_path):
    try:
        with open(file_path, 'rb') as f:
            raw = f.read()
        
        problems = []
        
        # 1. Check for invalid UTF-8
        try:
            content = raw.decode('utf-8')
        except UnicodeDecodeError:
            problems.append("INVALID_UTF8")
            # Try to see if it's cp1256
            try:
                raw.decode('cp1256')
                problems.append("IS_CP1256")
            except:
                pass
            return problems

        # 2. Check for common mojibake patterns in UTF-8
        # Patterns like: ط§ (alif), ظ„ (lam), طھ (teh), ظٹ (yeh), ظ… (meem)
        mojibake_patterns = ['ط§', 'ظ„', 'طھ', 'ظٹ', 'ظ…', 'ط±', 'ط§', 'ط©']
        found_patterns = [p for p in mojibake_patterns if p in content]
        if found_patterns:
            problems.append(f"MOJIBAKE_DETECTED({','.join(found_patterns)})")
            
        return problems
    except Exception as e:
        return [f"ERROR: {str(e)}"]

def main():
    targets = ['src', 'backend', 'scripts', 'public']
    results = {}
    for target in targets:
        abs_target = os.path.join(os.getcwd(), target)
        if not os.path.exists(abs_target): continue
        for root, dirs, files in os.walk(abs_target):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.json', '.go', '.md', '.sql', '.css', '.html')):
                    path = os.path.join(root, file)
                    problems = detect_problems(path)
                    if problems:
                        results[path] = problems
    
    for path, problems in results.items():
        print(f"{path}: {problems}")

if __name__ == "__main__":
    main()
