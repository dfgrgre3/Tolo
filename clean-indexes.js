const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = schema.split('\n');

const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('@@index')) {
        // match the fields array
        const match = trimmed.match(/@@index\(\[(.*?)\]\)/);
        if (match) {
            const fieldsStr = match[1];
            const fields = fieldsStr.split(',').map(f => f.trim().replace(/['"]/g, ''));
            
            // Allow if it's a single field and it's 'email' or ends with 'Id' or 'id'
            if (fields.length === 1) {
                const f = fields[0];
                if (f.toLowerCase() === 'email' || f.endsWith('Id') || f.endsWith('id')) {
                    return true; // Keep this index
                }
            }
            // Allow two fields if both are 'Id' related (common for bridging tables)
            if (fields.length === 2 && fields.every(f => f.endsWith('Id') || f.endsWith('id'))) {
                return true; 
            }
            
            // Otherwise remove the index
            return false;
        }
        return false; // Remove index with no bracket match or weird syntax
    }
    return true; // Keep non-index lines
});

fs.writeFileSync('prisma/schema.prisma', cleanedLines.join('\n'), 'utf8');
console.log('Cleaned unnecessary indexes from schema.prisma');
