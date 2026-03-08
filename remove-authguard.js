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
    
    // remove AuthGuard
    content = content.replace(/import\s*\{\s*AuthGuard\s*\}\s*from\s+['"][^'"]+AuthGuard['"];?\r?\n?/g, '');
    content = content.replace(/<AuthGuard>\r?\n?/g, '');
    content = content.replace(/<\/AuthGuard>\r?\n?/g, '');
    
    // remove other auth-related imports if they are throwing errors
    content = content.replace(/import\s*\{\s*authService[^}]*\}\s*from\s+['"][^'"]*auth-service['"];?\r?\n?/g, '');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}

walkDir(path.join(__dirname, 'src', 'app'), processFile);
