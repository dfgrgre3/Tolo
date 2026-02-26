const fs = require('fs');
const path = require('path');

const filesToSearch = [
  'src/lib/server-data-fetch.ts',
  'src/lib/oauth.ts',
  'src/lib/api-utils.ts',
  'src/app/api/notifications/send/route.ts',
  'src/app/api/notifications/mark-read/route.ts',
  'src/app/api/security/events/route.ts',
  'src/app/api/notifications/bulk/route.ts',
  'src/app/api/recommendations/route.ts',
  'src/app/api/ai/sentiment/route.ts',
  'src/app/api/db-monitor/route.ts',
  'src/app/api/events/upcoming/route.ts',
  'src/app/api/database-partitions/route.ts',
  'src/app/api/ai/recommendations/route.ts',
  'src/app/api/ai/recommendations/track/route.ts',
  'src/app/api/ai/content/route.ts',
  'src/app/api/ai/chat/route.ts',
  'src/app/api/auth/analytics/route.ts',
  'src/app/api/auth/qr-login/[action]/route.ts',
  'src/app/api/auth/security-questions/get/route.ts',
  'src/app/api/auth/sessions/route.ts',
  'src/app/api/auth/sessions/[id]/route.ts',
  'src/app/api/auth/security-questions/set/route.ts',
  'src/app/api/auth/status/route.ts',
  'src/app/api/auth/resend-two-factor/route.ts',
  'src/app/api/auth/phone/resend/route.ts',
  'src/app/api/auth/phone/verify/route.ts',
  'src/app/api/auth/passkey/delete/route.ts',
  'src/app/api/auth/passkey/register-options/route.ts',
  'src/app/api/auth/passkey/rename/route.ts',
  'src/app/api/auth/phone/send-otp/route.ts',
  'src/app/api/auth/change-password/route.ts',
  'src/app/api/auth/biometric/setup/route.ts',
  'src/app/api/auth/2fa/recovery-codes/route.ts',
  'src/app/api/auth/2fa/status/route.ts',
  'src/app/api/admin/cleanup-challenges/route.ts'
];

let updatedCount = 0;

for (const file of filesToSearch) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    let oldContent = content;
    
    // Add import { auth } from '@/auth'; if not exists
    if (content.includes('verifyToken') && !content.includes('import { auth } from')) {
        const importMatches = [...content.matchAll(/^import .*;?$/gm)];
        const lastImportStr = importMatches.length > 0 ? importMatches[importMatches.length - 1][0] : null;
        if (lastImportStr) {
            const idx = content.lastIndexOf(lastImportStr) + lastImportStr.length;
            content = content.slice(0, idx) + '\nimport { auth } from "@/auth";' + content.slice(idx);
        } else {
            content = 'import { auth } from "@/auth";\n' + content;
        }
    }

    // Replace actual token verification lines
    content = content.replace(/await\s+verifyToken\([^)]*\)/g, '(await (async () => { const session = await auth(); return session?.user ? { userId: session.user.id, email: session.user.email, role: session.user.role, id: session.user.id } : null; })())');
    
    content = content.replace(/await\s+(?:authService\.)?verifyTokenFromRequest\([^)]*\)/g, '(await (async () => { const session = await auth(); return session?.user ? { isValid: true, user: { userId: session.user.id, email: session.user.email, role: session.user.role, id: session.user.id } } : { isValid: false }; })())');
    
    // Remove the verifyToken import
    content = content.replace(/import\s*\{\s*verifyToken(?:[^}]*)?\}\s*from\s*['"]@\/lib\/services\/auth-service['"];?/g, '');
    
    if (content !== oldContent) {
        fs.writeFileSync(fullPath, content);
        updatedCount++;
    }
  }
}

console.log(`Updated ${updatedCount} files.`);
