import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Let's search for some Arabic strings
    # "حدث" is d8 ad d8 af d8 ab
    if b'\xd8\xad\xd8\xaf\xd8\xab' in data:
        print("Found Arabic string 'حدث' in UTF-8 bytes")
    else:
        print("Did NOT find Arabic string 'حدث' as UTF-8")
        # Let's see some other potential encodings
        # "ح" in Windows-1252/1256?
        # Actually let's just look at any bytes > 127
        high_bytes = [(i, b) for i, b in enumerate(data) if b > 127]
        if high_bytes:
            print(f"Found {len(high_bytes)} bytes > 127")
            # Show first 10
            for i, b in high_bytes[:10]:
                print(f"Index {i}: {b:02x}")
        else:
            print("No bytes > 127 found")

except Exception as e:
    print(f"Error: {e}")
