
file_path = r'src/app/layout.tsx'
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

# Let's see some bytes around the description
start = raw_bytes.find(b'description:')
if start != -1:
    sample = raw_bytes[start:start+100]
    print(f"Raw bytes: {sample}")
    
    # Try decoding with DIFFERENT encodings
    for enc in ['utf-8', 'cp1256', 'cp1252', 'utf-16']:
        try:
            print(f"As {enc}: {sample.decode(enc)[:50]}")
        except:
            print(f"As {enc}: FAILED")
