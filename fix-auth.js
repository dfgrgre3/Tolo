const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join('d:', 'thanawy', 'src', 'app', 'api'));
files.push(path.join('d:', 'thanawy', 'src', 'lib', 'server-data-fetch.ts'));

let replacements = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let originalText = content;
    
    // Pattern 1 multi-line matcher
    // We want to match:
    // const userId = req.headers.get("x-user-id");
    // if (!userId) {
    //   return unauthorizedResponse();
    // }
    // const decodedToken: any = { userId: "default-user" };
    // And replace it with:
    // const decodedToken = await getAuthenticatedUser(req);
    // if (!decodedToken) { return unauthorizedResponse(); }
    
    content = content.replace(
        /const\s+userId\s*=\s*(req|request)\.headers\.get\(['"]x-user-id['"]\);\s*if\s*\(!userId\)\s*\{\s*return\s+unauthorizedResponse\(\);\s*\}\s*const\s+(decodedToken|user):\s*any\s*=\s*\{\s*userId:\s*['"]default-user['"]\s*\};/g,
        (match, reqVar, varName) => {
            replacements++;
            return `const ${varName} = await getAuthenticatedUser(${reqVar});\n      if (!${varName}) {\n        return unauthorizedResponse();\n      }`;
        }
    );
    
    if (content !== originalText) {
        console.log('Modified auth logic in', file);
    }

    let modifiedForImport = content;
    
    // If modified auth logic, add imports...
    if (content !== originalText && !content.includes('getAuthenticatedUser')) {
        // Find existing import from '@/lib/api-utils'
        const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/api-utils['"]/);
        if (importMatch) {
            let imports = importMatch[1];
            if (!imports.includes('getAuthenticatedUser')) {
                modifiedForImport = content.replace(importMatch[0], `import { ${imports.trim()}, getAuthenticatedUser } from '@/lib/api-utils'`);
            }
        } else {
            // Need to insert import
            modifiedForImport = "import { getAuthenticatedUser } from '@/lib/api-utils';\n" + content;
        }
    }
    
    if (modifiedForImport !== originalText) {
        fs.writeFileSync(file, modifiedForImport, 'utf8');
        console.log('Saved', file);
    }
}
console.log('Total replacements:', replacements);
