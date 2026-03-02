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
    
    // Remove auth-service and verifyToken imports
    content = content.replace(/import\s+.*\{[^}]*verifyToken[^}]*\}\s+from\s+['"][^'"]*auth-service['"];?\r?\n?/g, '');
    content = content.replace(/import\s+.*authService.*\s+from\s+['"][^'"]*auth-service['"];?\r?\n?/g, '');
    
    // In server-data-fetch.ts and others:
    // const payload = await authService.verifyToken(token);
    content = content.replace(/const\s+(\w+)\s*=\s*await\s*authService\.verifyToken\([^)]*\);/g, 'const $1 = null;');
    // const decodedToken = await verifyToken(req);
    content = content.replace(/const\s+(\w+)\s*=\s*await\s*verifyToken\([^)]*\);/g, 'const $1 = null;');
    
    // authService.requireAuth(request)
    content = content.replace(/const\s+(\w+)\s*=\s*await\s*authService\.requireAuth\([^)]*\);/g, 'const $1 = { success: false, response: new Response("Unauthorized", {status: 401}) };');
    content = content.replace(/const\s+(\w+)\s*=\s*await\s*authService\.verifyApiToken\([^)]*\);/g, 'const $1 = null;');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}

walkDir(path.join(__dirname, 'src'), processFile);
