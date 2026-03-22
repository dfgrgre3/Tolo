import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Remove BOM if exists
    if data.startswith(b'\xef\xbb\xbf'):
        data = data[3:]
        print("Removed UTF-8 BOM")
        with open(file_path, "wb") as f:
            f.write(data)
        print("File saved without BOM")
    else:
        print("No BOM found")
except Exception as e:
    print(f"Error: {e}")
