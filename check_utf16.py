import sys

file_path = r"d:\thanawy\src\app\api\courses\route.ts"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # content is a Python string (internally usually UTF-32 or UTF-16 depending on build/ver, but let's emulate UTF-16)
    # Actually Python strings are safe.
    
    # Let's count UTF-16 code units (surrogate pairs count as 2)
    utf16_content = content.encode('utf-16le') # skip BOM
    
    # Actually, UTF-16 code units are 2 bytes each.
    # So index 5744 (if it's code units) would be byte 5744 * 2 OR it's the 5744-th code unit.
    
    code_units = []
    for char in content:
        if ord(char) > 0xFFFF: # surrogate pair
            code_units.append(char)
            code_units.append(char)
        else:
            code_units.append(char)
            
    if 5744 < len(code_units):
        chunk = code_units[5744-10:5744+10]
        print(f"Char at UTF-16 index 5744: '{code_units[5744]}' (hex {ord(code_units[5744]):04x})")
        print(f"Chunk: {''.join(chunk)}")
    else:
        print(f"Index 5744 out of bounds (len {len(code_units)})")
        
except Exception as e:
    print(f"Error: {e}")
