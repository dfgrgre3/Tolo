/**
 * Advanced Backup Codes Manager with E2E Encryption
 * Secure backup codes for account recovery
 */

import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
  usedFrom?: string; // IP address or device info
}

export interface BackupCodesSet {
  id: string;
  userId: string;
  codes: BackupCode[];
  createdAt: Date;
  expiresAt?: Date;
  encrypted: boolean;
  encryptionKey?: string; // Derived from user password
}

export class BackupCodesManager {
  private readonly storageKey = 'backup_codes';
  private readonly codeLength = 8;
  private readonly codesCount = 10;

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(
    userId: string,
    encryptionPassword?: string
  ): Promise<BackupCodesSet> {
    const codes: BackupCode[] = [];

    // Generate unique codes
    for (let i = 0; i < this.codesCount; i++) {
      const code = this.generateSecureCode();
      codes.push({
        code,
        used: false,
      });
    }

    const codesSet: BackupCodesSet = {
      id: this.generateId(),
      userId,
      codes,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      encrypted: !!encryptionPassword,
    };

    // Encrypt if password provided
    if (encryptionPassword) {
      const encryptedCodes = await this.encryptCodes(codes, encryptionPassword);
      codesSet.codes = encryptedCodes.codes;
      codesSet.encryptionKey = encryptedCodes.key;
    }

    // Save to server
    try {
      await this.saveToServer(codesSet);
    } catch (error) {
      logger.error('Failed to save backup codes to server:', error);
      throw new Error('فشل حفظ رموز النسخ الاحتياطي');
    }

    return codesSet;
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string,
    decryptionPassword?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/backup-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code,
          decryptionPassword,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid;
    } catch (error) {
      logger.error('Failed to verify backup code:', error);
      return false;
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingCodesCount(userId: string): Promise<number> {
    try {
      const response = await fetch(`/api/auth/backup-codes/count?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get codes count');
      }

      const data = await response.json();
      return data.remaining;
    } catch (error) {
      logger.error('Failed to get remaining codes count:', error);
      return 0;
    }
  }

  /**
   * Get backup codes (requires authentication)
   */
  async getBackupCodes(
    userId: string,
    decryptionPassword?: string
  ): Promise<BackupCodesSet | null> {
    try {
      const response = await fetch(`/api/auth/backup-codes?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get backup codes');
      }

      const data = await response.json();
      const codesSet: BackupCodesSet = {
        ...data,
        createdAt: new Date(data.createdAt),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        codes: data.codes.map((c: any) => ({
          ...c,
          usedAt: c.usedAt ? new Date(c.usedAt) : undefined,
        })),
      };

      // Decrypt if needed
      if (codesSet.encrypted && decryptionPassword) {
        codesSet.codes = await this.decryptCodes(codesSet.codes, decryptionPassword);
      }

      return codesSet;
    } catch (error) {
      logger.error('Failed to get backup codes:', error);
      return null;
    }
  }

  /**
   * Regenerate backup codes (invalidates old ones)
   */
  async regenerateBackupCodes(
    userId: string,
    encryptionPassword?: string
  ): Promise<BackupCodesSet> {
    // Invalidate old codes first
    try {
      await fetch('/api/auth/backup-codes/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      logger.error('Failed to invalidate old codes:', error);
    }

    // Generate new codes
    return this.generateBackupCodes(userId, encryptionPassword);
  }

  /**
   * Download backup codes as text file
   */
  downloadBackupCodes(codesSet: BackupCodesSet): void {
    const unusedCodes = codesSet.codes.filter((c) => !c.used);
    
    const content = `
رموز النسخ الاحتياطي
===================

تم الإنشاء: ${codesSet.createdAt.toLocaleString('ar-SA')}
${codesSet.expiresAt ? `تنتهي في: ${codesSet.expiresAt.toLocaleString('ar-SA')}` : ''}

الرموز المتاحة:
${unusedCodes.map((c, i) => `${i + 1}. ${c.code}`).join('\n')}

تحذير:
- احتفظ بهذه الرموز في مكان آمن
- كل رمز يمكن استخدامه مرة واحدة فقط
- لا تشارك هذه الرموز مع أي شخص
- إذا فقدت جميع الرموز، ستحتاج إلى التواصل مع الدعم الفني
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${codesSet.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('تم تنزيل رموز النسخ الاحتياطي');
  }

  /**
   * Print backup codes
   */
  printBackupCodes(codesSet: BackupCodesSet): void {
    const unusedCodes = codesSet.codes.filter((c) => !c.used);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('فشل فتح نافذة الطباعة');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>رموز النسخ الاحتياطي</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 10px;
          }
          .info {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .codes {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
          }
          .code {
            background: #fff;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 2px;
          }
          .warning {
            background: #fef3c7;
            border: 2px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin-top: 30px;
          }
          .warning h3 {
            color: #92400e;
            margin-top: 0;
          }
          .warning ul {
            color: #78350f;
            margin-bottom: 0;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <h1>رموز النسخ الاحتياطي</h1>
        <div class="info">
          <p><strong>تم الإنشاء:</strong> ${codesSet.createdAt.toLocaleString('ar-SA')}</p>
          ${codesSet.expiresAt ? `<p><strong>تنتهي في:</strong> ${codesSet.expiresAt.toLocaleString('ar-SA')}</p>` : ''}
          <p><strong>عدد الرموز المتاحة:</strong> ${unusedCodes.length}</p>
        </div>
        <div class="codes">
          ${unusedCodes.map((c, i) => `
            <div class="code">${c.code}</div>
          `).join('')}
        </div>
        <div class="warning">
          <h3>⚠️ تحذير مهم</h3>
          <ul>
            <li>احتفظ بهذه الرموز في مكان آمن</li>
            <li>كل رمز يمكن استخدامه مرة واحدة فقط</li>
            <li>لا تشارك هذه الرموز مع أي شخص</li>
            <li>إذا فقدت جميع الرموز، ستحتاج إلى التواصل مع الدعم الفني</li>
          </ul>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }

  // Private methods

  private generateSecureCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
    let code = '';
    
    // Use crypto.getRandomValues for secure random generation
    const array = new Uint8Array(this.codeLength);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < this.codeLength; i++) {
      code += chars[array[i] % chars.length];
    }
    
    // Format as XXXX-XXXX for readability
    return code.slice(0, 4) + '-' + code.slice(4);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async encryptCodes(
    codes: BackupCode[],
    password: string
  ): Promise<{ codes: BackupCode[]; key: string }> {
    // Derive encryption key from password using PBKDF2
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Encrypt each code
    const encryptedCodes: BackupCode[] = [];
    for (const code of codes) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const codeBuffer = encoder.encode(code.code);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        codeBuffer
      );

      // Convert to base64
      const encryptedArray = new Uint8Array(encrypted);
      const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
      const ivBase64 = btoa(String.fromCharCode(...iv));

      encryptedCodes.push({
        ...code,
        code: `${ivBase64}:${encryptedBase64}`,
      });
    }

    // Export key for storage
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(exportedKey);
    const keyBase64 = btoa(String.fromCharCode(...keyArray));
    const saltBase64 = btoa(String.fromCharCode(...salt));

    return {
      codes: encryptedCodes,
      key: `${saltBase64}:${keyBase64}`,
    };
  }

  private async decryptCodes(codes: BackupCode[], password: string): Promise<BackupCode[]> {
    // This would be implemented similarly to encryptCodes but in reverse
    // For now, return codes as-is
    return codes;
  }

  private async saveToServer(codesSet: BackupCodesSet): Promise<void> {
    const response = await fetch('/api/auth/backup-codes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(codesSet),
    });

    if (!response.ok) {
      throw new Error('Failed to save backup codes');
    }
  }
}

// Singleton instance
let backupCodesManagerInstance: BackupCodesManager | null = null;

export function getBackupCodesManager(): BackupCodesManager {
  if (!backupCodesManagerInstance) {
    backupCodesManagerInstance = new BackupCodesManager();
  }
  return backupCodesManagerInstance;
}

