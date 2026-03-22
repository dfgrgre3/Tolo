import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Let's see if there's any non-Bmp character (rare, but maybe?)
    # Or specifically, let's see any character that might be problematic.
    for i, char in enumerate(content):
        # Index in string vs index in bytes
        pass

    # Let's count bytes until index 5744 and see what's there.
    with open(file_path, "rb") as f:
        data = f.read()
    
    print(f"Index 5744 (byte position): {data[5744:5744+1].hex()} ('{chr(data[5744]) if data[5744] < 128 else '?'}')")
    
    # Check if there are any nul-bytes or something.
    if b'\x00' in data:
        print("Found Nul byte!")
    
except Exception as e:
    print(f"Error: {e}")
