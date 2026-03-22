import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    print(f"Total bytes: {len(data)}")
    
    # Check BOM
    if data.startswith(b'\xef\xbb\xbf'):
        print("BOM detected: UTF-8")
    elif data.startswith(b'\xff\xfe'):
        print("BOM detected: UTF-16 LE")
    elif data.startswith(b'\xfe\xff'):
        print("BOM detected: UTF-16 BE")
    else:
        print("No BOM detected")

    # Try to find what's at 5744 exactly
    target = 5744
    if target < len(data):
        print(f"Bytes [5740:5750]: {data[target-4:target+6].hex(' ')}")
        try:
            print(f"Decoded [5740:5750]: {data[target-4:target+6].decode('utf-8', errors='replace')}")
        except:
            print("Could not decode")
except Exception as e:
    print(f"Error: {e}")
