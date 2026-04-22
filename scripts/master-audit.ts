#!/usr/bin/env tsx

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

interface AuditTask {
    name: string;
    command: string;
    category: 'Config' | 'Database' | 'Structure' | 'Code Quality' | 'Testing' | 'Build';
    critical: boolean; // If true, failure is a major issue
}

const TASKS: AuditTask[] = [
    { name: 'Environment Check', command: 'npm run check:env', category: 'Config', critical: true },
    { name: 'Database Conflicts', command: 'npm run check:db-conflicts', category: 'Database', critical: true },
    { name: 'API Route Duplicates', command: 'npm run check:api-routes', category: 'Structure', critical: false },
    { name: 'Page Duplicates', command: 'npm run check:pages', category: 'Structure', critical: false },
    { name: 'Static Analysis (Lint & Types)', command: 'npm run check:errors', category: 'Code Quality', critical: true },
    { name: 'Unit & Integration Tests', command: 'npm run test', category: 'Testing', critical: true },
    // Build is often the ultimate check, but can be slow.
    { name: 'Build Verification', command: 'npm run build', category: 'Build', critical: true },
];

interface TaskResult {
    task: AuditTask;
    success: boolean;
    output: string;
    duration: number;
}

async function runTask(task: AuditTask): Promise<TaskResult> {
    console.log(`\nًں”„ Running: ${task.name}...`);
    const start = Date.now();
    try {
        const { stdout, stderr } = await execAsync(task.command, { maxBuffer: 1024 * 1024 * 50 }); // 50MB buffer
        const duration = Date.now() - start;
        console.log(`âœ… ${task.name} Passed (${(duration / 1000).toFixed(2)}s)`);
        return { task, success: true, output: stdout + '\n' + stderr, duration };
    } catch (error: any) {
        const duration = Date.now() - start;
        console.log(`â‌Œ ${task.name} Failed (${(duration / 1000).toFixed(2)}s)`);
        return { task, success: false, output: error.stdout + '\n' + error.stderr, duration };
    }
}

async function main() {
    console.log('ًںڑ€ Starting Master Project Audit...');
    console.log('=====================================');

    const results: TaskResult[] = [];

    for (const task of TASKS) {
        const result = await runTask(task);
        results.push(result);
        // If a critical task fails, we might want to stop? 
        // For now, let's run everything to get a full report.
    }

    generateReport(results);
}

function generateReport(results: TaskResult[]) {
    const reportPath = path.join(process.cwd(), 'MASTER_AUDIT_REPORT.md');
    const timestamp = new Date().toLocaleString('ar-SA');

    let content = `# ًں›،ï¸ڈ Master Project Audit Report\n\n`;
    content += `**Date:** ${timestamp}\n\n`;

    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    content += `## ًں“ٹ Summary\n`;
    content += `- **Total Checks:** ${results.length}\n`;
    content += `- **Passed:** ${passed.length} âœ…\n`;
    content += `- **Failed:** ${failed.length} â‌Œ\n\n`;

    content += `## ًں“‌ Details\n\n`;

    // Group by category
    const categories = Array.from(new Set(results.map(r => r.task.category)));

    for (const category of categories) {
        content += `### ${category}\n`;
        const categoryResults = results.filter(r => r.task.category === category);

        for (const result of categoryResults) {
            const icon = result.success ? 'âœ…' : 'â‌Œ';
            content += `- ${icon} **${result.task.name}** (${(result.duration / 1000).toFixed(2)}s)\n`;
        }
        content += `\n`;
    }

    if (failed.length > 0) {
        content += `## ًںڑ¨ Failure Details\n\n`;
        for (const result of failed) {
            content += `### â‌Œ ${result.task.name}\n`;
            content += `**Command:** \`${result.task.command}\`\n\n`;
            content += `**Output:**\n`;
            content += "```\n";
            // Truncate output if too long
            const outputLines = result.output.split('\n');
            const maxLines = 50;
            if (outputLines.length > maxLines) {
                content += outputLines.slice(0, 20).join('\n');
                content += `\n... (${outputLines.length - maxLines} more lines) ...\n`;
                content += outputLines.slice(-20).join('\n');
            } else {
                content += result.output;
            }
            content += "\n```\n\n";
        }
    }

    fs.writeFileSync(reportPath, content, 'utf-8');
    console.log(`\nًں“„ Report generated at: ${reportPath}`);

    if (failed.length > 0) {
        console.log('\nâ‌Œ Audit completed with errors.');
        process.exit(1);
    } else {
        console.log('\nâœ… Audit completed successfully. No errors found.');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
