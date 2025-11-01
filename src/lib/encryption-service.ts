import crypto from 'crypto';

type EncryptionAlgorithm = 'aes-256-cbc' | 'aes-256-gcm';
type HashAlgorithm = 'sha256' | 'sha512';

interface EncryptionServiceConfig {
  algorithm: EncryptionAlgorithm;
  hashAlgorithm: HashAlgorithm;
  key: string;
  ivLength: number;
}

export class EncryptionService {
  constructor(private config: EncryptionServiceConfig) {
    if (config.key.length < 32) {
      throw new Error('مفتاح التشفير يجب أن يكون 32 حرفًا على الأقل');
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipheriv(
      this.config.algorithm,
      Buffer.from(this.config.key),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      this.config.algorithm,
      Buffer.from(this.config.key),
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  hash(text: string): string {
    return crypto
      .createHash(this.config.hashAlgorithm)
      .update(text + this.config.key) // Salt with key
      .digest('hex');
  }

  static generateKey(length = 32): string {
    return crypto
      .randomBytes(length)
      .toString('hex');
  }
}
