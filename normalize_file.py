import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Try to decode as utf-8, ignore errors just to see
    content = data.decode('utf-8', errors='ignore')
    
    # Let's see if we can just re-save it cleanly
    # Use only \n for line endings
    content = content.replace('\r\n', '\n')
    
    # Re-save as pure utf-8
    with open(file_path, "w", encoding="utf-8", newline='\n') as f:
        f.write(content)
        
    print("Normalised file to LF and pure UTF-8")
except Exception as e:
    print(f"Error: {e}")
