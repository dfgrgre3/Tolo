const fs = require('fs');
const path = require('path');

const win1256 = {
    '\u20AC': 0x80, '\u067E': 0x81, '\u067e': 0x81, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
    '\u02C6': 0x88, '\u2030': 0x89, '\u0679': 0x8A, '\u067b': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u0686': 0x8D, '\u017D': 0x8E, '\u068E': 0x8F,
    '\u0698': 0x90, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u06AF': 0x98, '\u2122': 0x99, '\u06A9': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C, '\u200C': 0x9D, '\u200D': 0x9E, '\u06BA': 0x9F,
    '\u00A0': 0xA0, '\u060C': 0xA1, '\u00A2': 0xA2, '\u00A3': 0xA3, '\u00A4': 0xA4, '\u00A5': 0xA5, '\u00A6': 0xA6, '\u00A7': 0xA7,
    '\u00A8': 0xA8, '\u00A9': 0xA9, '\u0647': 0xAA, '\u06BE': 0xAA, '\u00AB': 0xAB, '\u00AC': 0xAC, '\u00AD': 0xAD, '\u00AE': 0xAE, '\u00AF': 0xAF,
    '\u00B0': 0xB0, '\u00B1': 0xB1, '\u00B2': 0xB2, '\u00B3': 0xB3, '\u00B4': 0xB4, '\u00B5': 0xB5, '\u00B6': 0xB6, '\u00B7': 0xB7,
    '\u00B8': 0xB8, '\u00B9': 0xB9, '\u061B': 0xBA, '\u00BB': 0xBB, '\u00BC': 0xBC, '\u00BD': 0xBD, '\u00BE': 0xBE, '\u061F': 0xBF,
};

function getWin1256Byte(char) {
    if (win1256[char] !== undefined) return win1256[char];
    const code = char.charCodeAt(0);
    if (code >= 0x80 && code <= 0xFF) return code;
    return null;
}

function fixMojo(text) {
    const prefixMap = { 'ط': 0xD8, 'ظ': 0xD9, 'ع': 0xDA, 'غ': 0xDB };
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const c1 = text[i];
        const b1 = prefixMap[c1];
        if (b1 !== undefined && i + 1 < text.length) {
            const c2 = text[i + 1];
            const b2 = getWin1256Byte(c2);
            if (b2 !== null && b2 >= 0x80 && b2 <= 0xBF) {
                try {
                    result += Buffer.from([b1, b2]).toString('utf8');
                    i++;
                    continue;
                } catch (e) {}
            }
        }
        result += c1;
    }
    return result;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixMojo(content);
    if (content !== fixedContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(`Fixed: ${filePath}`);
        return true;
    }
    return false;
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    let count = 0;
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!['node_modules', '.next', '.git', 'build', 'dist'].includes(file)) {
                count += walk(fullPath);
            }
        } else if (/\.(tsx|ts|js|jsx|json|md|css|scss|html)$/.test(file)) {
            if (processFile(fullPath)) count++;
        }
    });
    return count;
}

const targetDir = process.argv[2] || 'src';
console.log(`Scanning ${targetDir}...`);
const total = walk(path.resolve(targetDir));
console.log(`Done. Fixed ${total} files.`);
