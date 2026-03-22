import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    pos = 0
    lines = data.split(b'\n')
    for i, line in enumerate(lines):
        start = pos
        end = pos + len(line)
        if 5000 <= start <= 6500:
            print(f"Line {i+1}: start={start}, end={end}, content=\"{line.decode('utf-8', errors='replace').strip()}\"")
        pos += len(line) + 1 # +1 for \n
except Exception as e:
    print(f"Error: {e}")
