
import os

def fix_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Logic: 
        # 1. Take the string (which contains Arabic characters that are actually bytes)
        # 2. Encode it back to bytes using 'cp1256' (Windows-1256)
        # 3. Decode those bytes as 'utf-8'
        try:
            fixed_content = content.encode('cp1256').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            # If it fails, maybe it wasn't mojibake or it's partially corrupted
            return False

        if fixed_content == content:
            return False # No change
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    base_dir = r'src'
    target_extensions = ('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md')
    
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(target_extensions):
                full_path = os.path.join(root, file)
                if fix_file(full_path):
                    print(f"Fixed: {full_path}")
                    count += 1
    
    print(f"Total files fixed: {count}")

if __name__ == "__main__":
    main()
