
import os

def test_fix(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fixed_content = content.encode('cp1256').decode('utf-8')
        
        print("Original samples:")
        for line in content.splitlines()[14:18]:
            print(f"  {line}")
            
        print("\nFixed samples:")
        for line in fixed_content.splitlines()[14:18]:
            print(f"  {line}")
            
    except Exception as e:
        print(f"Error: {e}")

test_fix(r'src/app/layout.tsx')
