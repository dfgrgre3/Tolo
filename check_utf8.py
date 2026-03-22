import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    try:
        data.decode('utf-8')
        print("File is valid UTF-8 (after BOM removal)")
    except UnicodeDecodeError as e:
        print(f"UnicodeDecodeError at {e.start}: {e}")
        # Show bytes around the error
        start = max(0, e.start - 20)
        end = min(len(data), e.start + 20)
        chunk = data[start:end]
        print(f"Bytes around {e.start}: {chunk.hex(' ')}")

except Exception as e:
    print(f"Error: {e}")
