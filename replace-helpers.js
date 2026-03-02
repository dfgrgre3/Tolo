const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(file) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
    
    let original = fs.readFileSync(file, 'utf8');
    let content = original;
    
    // Replace API helpers import
    content = content.replace(/@\/app\/api\/auth\/_helpers/g, '@/lib/api-helpers');
    
    // Also remove any leftover requireAuth usage:
    // Some routes might have `const authResult = await authService.requireAuth(request);` etc.
    // That needs manual checking but let's see if we can find them.
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}

walkDir(path.join(__dirname, 'src', 'app', 'api'), processFile);
