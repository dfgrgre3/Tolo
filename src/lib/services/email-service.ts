import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';
// import { withRetry } from '@/lib/auth-utils';

const withRetry = async <T,>(fn: () => Promise<T>, options: any): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (options.onError) options.onError(error, 1);
    throw error;
  }
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
          from: process.env.SMTP_FROM || '"Thanawy App" <noreply@thanawy.com>',
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

    const subject = 'تفعيل حسابك في منصة ثانوية';
    const text = `مرحباً،\n\nيرجى النقر على الرابط التالي لتفعيل حسابك:\n${verificationLink}\n\nإذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذه الرسالة.`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>مرحباً بك في منصة ثانوية</h2>
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

    const subject = 'إعادة تعيين كلمة المرور - منصة ثانوية';
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
}

export const emailService = new EmailService();
