import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Write it back using the system's preferred way but ensuring UTF-8
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Rewritten file content with standard UTF-8")
except Exception as e:
    print(f"Error: {e}")
