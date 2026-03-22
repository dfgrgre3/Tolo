import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    pos = 0
    lines = data.split(b'\n')
    for i, line in enumerate(lines):
        if pos <= 5744 < pos + len(line) + 1:
            print(f"Index 5744 is in line {i+1} at byte {5744 - pos}")
            print(f"Line content: {line.decode('utf-8', errors='replace')}")
            # print it as bytes too
            print(f"Line bytes: {line.hex(' ')}")
        pos += len(line) + 1
except Exception as e:
    print(f"Error: {e}")
