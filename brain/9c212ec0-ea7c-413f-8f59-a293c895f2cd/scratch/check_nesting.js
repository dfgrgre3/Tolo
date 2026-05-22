
const fs = require('node:fs');
const content = fs.readFileSync(String.raw`d:\thanawy\frontend\src\app\(education)\exams\components\ExamGrades.tsx`, 'utf8');

let maxDepth = 0;
let currentDepth = 0;
let lines = content.split('\n');

for (const line of lines) {
    // This is a very crude way to count nesting based on { and }
    // But the user specifically mentioned functions.
    // Let's count arrow functions and function keywords.
    
    // A better way is to look for ( and => and {
    if (line.includes('{')) {
        currentDepth++;
        if (currentDepth > maxDepth) {
            maxDepth = currentDepth;
        }
    }
    if (line.includes('}')) {
        currentDepth--;
    }
}

// Actually, I'll just use a regex to find lines with many =>
// But that's also not accurate.

// Let's just look at the code again.
