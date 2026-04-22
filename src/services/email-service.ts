import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';
// import { withRetry } from '@/lib/auth-utils';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  onError?: (error: unknown, attempt: number) => void;
}

const withRetry = async <T,>(fn: () => Promise<T>, options: RetryOptions): Promise<T> => {
  let attempt = 1;
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs || 1000;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (options.onError) options.onError(error, attempt);
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
  throw new Error('Retry failed');
};
interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_SECURE,
    } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT || '587'),
          secure: SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });
        this.isConfigured = true;
        logger.info('Email service configured successfully');
      } catch (error) {
        logger.error('Failed to initialize email transporter:', error);
        this.isConfigured = false;
      }
    } else {
      logger.warn('Email service not configured: Missing SMTP environment variables');
      this.isConfigured = false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail({ to, subject, text, html }: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn(`[Mock Email] To: ${to}, Subject: ${subject}`);
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[Mock Email Content]: ${text}`);
      }
      return false;
    }

    try {
      const info = await withRetry(async () => {
        return this.transporter!.sendMail({
          from: process.env.SMTP_FROM || '"Tolo App" <noreply@tolo.com>',
          to,
          subject,
          text,
          html,
        });
      }, {
        maxAttempts: 3,
        delayMs: 1000,
        onError: (error: any, attempt: number) => {
          logger.warn(`Email sending attempt ${attempt} failed:`, error);
        }
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Error sending email after retries:', error);
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    const subject = 'تفعيل حسابك في منصة تولو';
    const text = `مرحباً،\n\nيرجى النقر على الرابط التالي لتفعيل حسابك:\n${verificationLink}\n\nإذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذه الرسالة.`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>مرحباً بك في منصة تولو</h2>
        <p>شكراً لتسجيلك معنا. يرجى النقر على الزر أدناه لتفعيل حسابك:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">تفعيل الحساب</a>
        </div>
        <p>أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationLink}</p>
        <p>إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send verification code (for 2FA or phone verification fallback)
   */
  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const subject = 'رمز التحقق الخاص بك';
    const text = `رمز التحقق الخاص بك هو: ${code}\n\nصلاحية الرمز 10 دقائق.`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>رمز التحقق</h2>
        <p>استخدم الرمز التالي لإكمال عملية التحقق:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f3f4f6; padding: 15px 30px; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; border: 1px solid #e5e7eb;">${code}</span>
        </div>
        <p>صلاحية الرمز 10 دقائق.</p>
        <p>لا تشارك هذا الرمز مع أي شخص.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetLink(to: string, token: string): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const subject = 'إعادة تعيين كلمة المرور - منصة تولو';
    const text = `مرحباً،\n\nلقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. يرجى النقر على الرابط التالي للتعيين:\n${resetLink}\n\nصلاحية الرابط ساعة واحدة.`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. يرجى النقر على الزر أدناه للتعيين:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">تعيين كلمة مرور جديدة</a>
        </div>
        <p>أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${resetLink}</p>
        <p>صلاحية الرابط ساعة واحدة.</p>
        <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send magic login link (Passwordless)
   */
  async sendMagicLink(to: string, token: string): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

    const subject = 'رابط الدخول السريع - منصة تولو';
    const text = `مرحباً،\n\nاستخدم الرابط التالي لتسجيل الدخول مباشرة إلى حسابك:\n${magicLink}\n\nصلاحية الرابط 15 دقيقة فقط.`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4F46E5; text-align: center;">دخول سريع وآمن</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.5;">مرحباً، لقد طلبت رابطاً لتسجيل الدخول السريع. انقر على الزر أدناه للدخول إلى حسابك فوراً دون الحاجة لكلمة مرور:</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${magicLink}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">دخول إلى المنصة</a>
        </div>
        <p style="color: #6B7280; font-size: 14px; text-align: center;">صلاحية الرابط 15 دقيقة فقء ويستخدم لمرة واحدة.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">إذا لم تطلب هذا الرابء يرجى تجاهل هذه الرسالة.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send an alert for a new login from a new device/location.
   */
  async sendLoginAlert(email: string, details: { ip: string; device: string; time: string }): Promise<boolean> {
    try {
      const subject = 'ًںڑ¨ تنبيه أمني: تسجيل دخول جديد';
      const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #e11d48;">تنبيه أمني جديد</h2>
          <p>تم تسجيل دخول جديد إلى حسابك في منصة تولو.</p>
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>الجهاز:</strong> ${details.device}</p>
            <p><strong>العنوان (IP):</strong> ${details.ip}</p>
            <p><strong>الوقت:</strong> ${details.time}</p>
          </div>
          <p>إذا لم تكن أنت من قام بهذا النشاء يرجى تغيير كلمة المرور فوراً.</p>
        </div>
      `;
      const text = `تنبيه أمني جديد: تم تسجيل دخول جديد إلى حسابك. الجهاز: ${details.device}، IP: ${details.ip}`;
      return await this.sendEmail({ to: email, subject, text, html });
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();
