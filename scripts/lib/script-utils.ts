import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import net from 'net';

/**
 * Colors for console output
 */
export const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

/**
 * Log a message with color
 */
export function log(message: string, color: string = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
}

/**
 * Kill a process by name (cross-platform)
 */
export async function killProcess(processName: string): Promise<void> {
    log(`Stopping ${processName} processes...`, colors.yellow);

    const isWindows = os.platform() === 'win32';

    try {
        if (isWindows) {
            // PowerShell command to find and kill process
            // Using a more robust PowerShell command that handles errors gracefully
            const cmd = `powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*${processName}*'} | Stop-Process -Force -ErrorAction SilentlyContinue"`;
            execSync(cmd, { stdio: 'ignore' });
        } else {
            // Unix/Linux/macOS
            execSync(`pkill -f ${processName}`, { stdio: 'ignore' });
        }
        log(`âœ“ Stopped ${processName}`, colors.green);
    } catch (_error) {
        // Ignore errors if process wasn't running
        // log(`No running ${processName} processes found or could not stop them.`, colors.gray);
    }
}

/**
 * Remove a directory recursively (cross-platform)
 */
export function removeDir(dirPath: string) {
    if (fs.existsSync(dirPath)) {
        log(`Removing ${dirPath}...`, colors.yellow);
        try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            log(`âœ“ ${dirPath} cleared`, colors.green);
        } catch (error) {
            log(`âœ— Failed to remove ${dirPath}: ${(error as Error).message}`, colors.red);
        }
    } else {
        log(`âœ“ ${dirPath} doesn't exist`, colors.gray);
    }
}

/**
 * Run a shell command and return output
 */
export function runCommand(command: string, cwd: string = process.cwd()): boolean {
    try {
        execSync(command, { stdio: 'inherit', cwd });
        return true;
    } catch (_error) {
        return false;
    }
}

/**
 * Check if a file exists
 */
function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Read file content
 */
function readFile(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write file content
 */
function writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Check if a port is in use
 */
function checkPort(port: number, host: string = 'localhost'): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}
