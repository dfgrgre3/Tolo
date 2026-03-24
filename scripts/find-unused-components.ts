
import fs from 'fs';
import path from 'path';

function getFiles(dir: string, extension: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file, extension));
        } else if (file.endsWith(extension)) {
            results.push(path.relative(dir, file));
        }
    });
    return results;
}

const COMPONENTS_DIR = path.join(process.cwd(), 'src/components');
const APP_DIR = path.join(process.cwd(), 'src/app');

async function findUnusedComponents() {
    console.log('Scanning for components...');

    // Get all .tsx files in src/components
    const componentFiles = getFiles(COMPONENTS_DIR, '.tsx');

    console.log(`Found ${componentFiles.length} components.`);

    const unusedFiles: string[] = [];

    for (const file of componentFiles) {
        const componentName = path.basename(file, '.tsx');
        // Simple check: search for the component name in src/app
        // This is not perfect (could be commented out, or aliased), but a good start.

        // We'll use a simpler approach: read all files in src/app and check for the string
        // Actually, let's just use grep via child_process if available, or just scan files.
        // Since we are in node, let's scan.

        const isUsed = await checkUsage(componentName);
        if (!isUsed) {
            unusedFiles.push(file);
        }
    }

    console.log('\nPotential unused components:');
    unusedFiles.forEach(f => console.log(`- ${f}`));
}

async function checkUsage(componentName: string): Promise<boolean> {
    const appFiles = getFiles(APP_DIR, '.tsx').concat(getFiles(APP_DIR, '.ts'));

    for (const file of appFiles) {
        const content = fs.readFileSync(path.join(APP_DIR, file), 'utf-8');
        if (content.includes(componentName)) {
            return true;
        }
    }
    return false;
}

findUnusedComponents().catch(console.error);
