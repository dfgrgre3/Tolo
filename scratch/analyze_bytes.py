
file_path = r'src/app/layout.tsx'
with open(file_path, 'rb') as f:
    content = f.read()

# Look for the description line manually in the bytes
start = content.find(b'description:')
if start != -1:
    end = content.find(b'\n', start)
    line_bytes = content[start:end]
    print(f"Bytes: {line_bytes}")
    try:
        print(f"Decoded as utf-8: {line_bytes.decode('utf-8')}")
    except:
        print("Failed to decode as utf-8")
    try:
        # If it's mojibake, maybe it's utf-8 bytes that were interpreted as cp1252
        # and then SAVED AS UTF-8.
        # So "ظ" is actually U+00D8, which is 0xC3 0x98 in the file.
        # We need to decode utf-8 -> get U+00D8 -> take byte 0xD8.
        text = line_bytes.decode('utf-8')
        mojibake_bytes = text.encode('cp1252')
        print(f"Mojibake bytes: {mojibake_bytes}")
        print(f"Final decoded: {mojibake_bytes.decode('utf-8')}")
    except Exception as e:
        print(f"Error in mojibake fix: {e}")
