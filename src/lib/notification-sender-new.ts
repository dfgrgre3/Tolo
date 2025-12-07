
/**
 * ظ…ظƒطھط¨ط© ظ…ط³ط§ط¹ط¯ط© ظ„ط¥ط±ط³ط§ظ„ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ ط¹ط¨ط± ظ‚ظ†ظˆط§طھ ظ…طھط¹ط¯ط¯ط©
 */
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { logger } from '@/lib/logger';

// ط¥ط±ط³ط§ظ„ ط¥ط´ط¹ط§ط± ط¹ط¨ط± ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ
export async function sendEmailNotification(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  try {
    const { to, subject, text, html, from = 'noreply@thanawy.com' } = options;

    logger.info(`ط¥ط±ط³ط§ظ„ ط¨ط±ظٹط¯ ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط¥ظ„ظ‰ ${to}: ${subject}`);

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط© ط§ظ„ظ„ط§ط²ظ…ط©
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('ظ…طھط؛ظٹط±ط§طھ ط¨ظٹط¦ط© SMTP ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©طŒ ط³ظٹطھظ… ط§ط³طھط®ط¯ط§ظ… ظ…ط­ط§ظƒط§ط© ط§ظ„ط¥ط±ط³ط§ظ„');
      return { success: true, simulated: true };
    }

    // ط¥ظ†ط´ط§ط، ظ†ط§ظ‚ظ„ ط¨ط±ظٹط¯ ط¥ظ„ظƒطھط±ظˆظ†ظٹ
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // طھط­ط¶ظٹط± ظ…ط­طھظˆظ‰ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ
    const emailText = text || (html ? html.replace(/<[^>]*>/g, '') : '');
    const emailHtml = html || (text ? `<p>${text}</p>` : '');

    // ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: emailText,
      html: emailHtml,
    });

    logger.info('طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ:', error);
    throw error;
  }
}

// ط¥ط±ط³ط§ظ„ ط¥ط´ط¹ط§ط± ط¹ط¨ط± ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ظ†طµظٹط© ط§ظ„ظ‚طµظٹط±ط© (SMS)
export async function sendSMSNotification(options: {
  to: string;
  body: string;
  from?: string;
}) {
  try {
    const { to, body, from = 'Thanawy' } = options;

    logger.info(`ط¥ط±ط³ط§ظ„ ط±ط³ط§ظ„ط© ظ†طµظٹط© ط¥ظ„ظ‰ ${to}: ${body}`);

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظˆط¬ظˆط¯ ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط© ط§ظ„ظ„ط§ط²ظ…ط©
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      logger.warn('ظ…طھط؛ظٹط±ط§طھ ï؟½ï؟½ظٹط¦ط© Twilio ط؛ظٹط± ظ…ظƒطھظ…ظ„ط©طŒ ط³ظٹطھظ… ط§ط³طھط®ط¯ط§ظ… ظ…ط­ط§ظƒط§ط© ط§ظ„ط¥ط±ط³ط§ظ„');
      return { success: true, simulated: true };
    }

    // ط§ط³طھط®ط¯ط§ظ… Twilio ظ„ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ظ†طµظٹط©
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    logger.info('طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ظ†طµظٹط©:', message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    logger.error('ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ظ†طµظٹط©:', error);
    throw error;
  }
}

// ط¥ط±ط³ط§ظ„ ط¥ط´ط¹ط§ط± ط¹ط¨ط± ظ‚ظ†ظˆط§طھ ظ…طھط¹ط¯ط¯ط©
export async function sendMultiChannelNotification(options: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  channels?: ('app' | 'email' | 'sms')[];
  actionUrl?: string;
  icon?: string;
}) {
  try {
    const {
      userId,
      title,
      message,
      type = 'info',
      channels = ['app'],
      actionUrl,
      icon
    } = options;

    // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ط¹ طھظپط¶ظٹظ„ط§طھ ط§ظ„ط¥ط´ط¹ط§ط±ط§طھ
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true, 
        phone: true, 
        name: true,
        emailNotifications: true,
        smsNotifications: true
      }
    });

    if (!user) {
      throw new Error('ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
    }

    const results: {
      app: any;
      email: any;
      sms: any;
    } = {
      app: null,
      email: null,
      sms: null
    };

    // ط¥ط±ط³ط§ظ„ ط¥ط´ط¹ط§ط± ط¯ط§ط®ظ„ ط§ظ„طھط·ط¨ظٹظ‚
    if (channels.includes('app')) {
      try {
        results.app = await prisma.notification.create({
          data: {
            userId,
            title,
            message,
            type,
            actionUrl,
            icon,
            isRead: false
          }
        });
      } catch (error) {
        logger.error('ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط¥ط´ط¹ط§ط± ط§ظ„طھط·ط¨ظٹظ‚:', error);
      }
    }

    // ط¥ط±ط³ط§ظ„ ط¨ط±ظٹط¯ ط¥ظ„ظƒطھط±ظˆظ†ظٹ (ظ…ط¹ ظ…ط±ط§ط¹ط§ط© طھظپط¶ظٹظ„ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…)
    if (channels.includes('email') && user.email && (user.emailNotifications ?? true)) {
      try {
        results.email = await sendEmailNotification({
          to: user.email,
          subject: title,
          text: message,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #3b82f6; margin: 0;">ط«ظ†ط§ظˆظٹ</h1>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">${title}</h2>
                <p style="color: #4b5563; margin: 0; line-height: 1.5;">${message}</p>
              </div>
              ${actionUrl ? `<div style="text-align: center; margin: 20px 0;">
                <a href="${actionUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">ط¹ط±ط¶ ط§ظ„طھظپط§طµظٹظ„</a>
              </div>` : ''}
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p>طھظ… ط¥ط±ط³ط§ظ„ ظ‡ط°ظ‡ ط§ظ„ط±ط³ط§ظ„ط© ظ…ظ† ظ…ظ†طµط© ط«ظ†ط§ظˆظٹ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©</p>
                <p>آ© ${new Date().getFullYear()} ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ‚ ظ…ط­ظپظˆط¸ط©</p>
              </div>
            </div>
          `
        });
      } catch (error) {
        logger.error('ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ:', error);
      }
    }

    // ط¥ط±ط³ط§ظ„ ط±ط³ط§ظ„ط© ظ†طµظٹط© (ظ…ط¹ ظ…ط±ط§ط¹ط§ط© طھظپط¶ظٹظ„ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…)
    if (channels.includes('sms') && user.phone && (user.smsNotifications ?? false)) {
      try {
        results.sms = await sendSMSNotification({
          to: user.phone,
          body: `[ط«ظ†ط§ظˆظٹ] ${title}: ${message}${actionUrl ? ` ط±ط§ط¨ط·: ${actionUrl}` : ''}`
        });
      } catch (error) {
        logger.error('ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط±ط³ط§ظ„ط© ط§ظ„ظ†طµظٹط©:', error);
      }
    }

    return results;
  } catch (error) {
    logger.error('ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط¥ط´ط¹ط§ط± ظ…طھط¹ط¯ط¯ ط§ظ„ظ‚ظ†ظˆط§طھ:', error);
    throw error;
  }
}
