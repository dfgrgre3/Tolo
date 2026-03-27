/**
 * Notification Sender
 * مكتبة مساعدة لإرسال الإشعارات عبر قنوات متعددة
 * (بريد إلكتروني، رسائل نصية، إشعارات داخل التطبيق)
 */

import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { logger } from '@/lib/logger';

// ==============================
// إرسال إشعار عبر البريد الإلكتروني
// ==============================
export async function sendEmailNotification(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    try {
        const { to, subject, text, html, from = 'noreply@thanawy.com' } = options;

        logger.info(`إرسال بريد إلكتروني إلى ${to}: ${subject}`);

        // التحقق من وجود متغيرات البيئة اللازمة
        if (
            !process.env.SMTP_HOST ||
            !process.env.SMTP_PORT ||
            !process.env.SMTP_USER ||
            !process.env.SMTP_PASS
        ) {
            logger.warn('متغيرات بيئة SMTP غير مكتملة، سيتم استخدام محاكاة الإرسال');
            return { success: true, simulated: true };
        }

        // إنشاء ناقل البريد الإلكتروني
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // تحضير محتوى البريد الإلكتروني
        const emailText = text || (html ? html.replace(/<[^>]*>/g, '') : '');
        const emailHtml = html || (text ? `<p>${text}</p>` : '');

        // إرسال البريد الإلكتروني
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text: emailText,
            html: emailHtml,
        });

        logger.info('تم إرسال البريد الإلكتروني:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('خطأ في إرسال البريد الإلكتروني:', error);
        throw error;
    }
}

// ==============================
// إرسال إشعار عبر الرسائل النصية (SMS)
// ==============================
export async function sendSMSNotification(options: {
    to: string;
    body: string;
    from?: string;
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    try {
        const { to, body } = options;

        logger.info(`إرسال رسالة نصية إلى ${to}`);

        // التحقق من وجود متغيرات البيئة اللازمة
        if (
            !process.env.TWILIO_ACCOUNT_SID ||
            !process.env.TWILIO_AUTH_TOKEN ||
            !process.env.TWILIO_PHONE_NUMBER
        ) {
            logger.warn('متغيرات بيئة Twilio غير مكتملة، سيتم استخدام محاكاة الإرسال');
            return { success: true, simulated: true };
        }

        // استخدام Twilio لإرسال الرسالة النصية
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        const message = await client.messages.create({
            body,
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
        });

        logger.info('تم إرسال الرسالة النصية:', message.sid);
        return { success: true, messageId: message.sid };
    } catch (error) {
        logger.error('خطأ في إرسال الرسالة النصية:', error);
        throw error;
    }
}

// ==============================
// إرسال إشعار عبر قنوات متعددة
// ==============================

export interface MultiChannelNotificationOptions {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    channels?: ('app' | 'email' | 'sms')[];
    actionUrl?: string;
    icon?: string;
}

import { Notification } from '@prisma/client';

export interface MultiChannelNotificationResult {
    app: Notification | null;
    email: { success: boolean; messageId?: string; simulated?: boolean } | null;
    sms: { success: boolean; messageId?: string; simulated?: boolean } | null;
}


export async function sendMultiChannelNotification(
    options: MultiChannelNotificationOptions
): Promise<MultiChannelNotificationResult> {
    const {
        userId,
        title,
        message,
        type = 'info',
        channels = ['app'],
        actionUrl,
        icon,
    } = options;

    try {
        // الحصول على بيانات المستخدم مع تفضيلات الإشعارات
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                phone: true,
                name: true,
                emailNotifications: true,
                smsNotifications: true,
            },
        });

        if (!user) {
            throw new Error(`المستخدم غير موجود: ${userId}`);
        }

        const results: MultiChannelNotificationResult = {
            app: null,
            email: null,
            sms: null,
        };

        // إرسال إشعار داخل التطبيق
        if (channels.includes('app')) {
            try {
                results.app = await prisma.notification.create({
                    data: {
                        userId,
                        title,
                        message,
                        type: type.toUpperCase() as any,
                        actionUrl,
                        icon,
                        isRead: false,
                    },
                });
            } catch (error) {
                logger.error('خطأ في إنشاء إشعار التطبيق:', error);
            }
        }

        // إرسال بريد إلكتروني (مع مراعاة تفضيلات المستخدم)
        if (channels.includes('email') && user.email && (user.emailNotifications ?? true)) {
            try {
                results.email = await sendEmailNotification({
                    to: user.email,
                    subject: title,
                    text: message,
                    html: buildEmailTemplate({ title, message, actionUrl }),
                });
            } catch (error) {
                logger.error('خطأ في إرسال البريد الإلكتروني:', error);
            }
        }

        // إرسال رسالة نصية (مع مراعاة تفضيلات المستخدم)
        if (channels.includes('sms') && user.phone && (user.smsNotifications ?? false)) {
            try {
                results.sms = await sendSMSNotification({
                    to: user.phone,
                    body: `[ثناوي] ${title}: ${message}${actionUrl ? ` رابط: ${actionUrl}` : ''}`,
                });
            } catch (error) {
                logger.error('خطأ في إرسال الرسالة النصية:', error);
            }
        }

        return results;
    } catch (error) {
        logger.error('خطأ في إرسال الإشعار متعدد القنوات:', error);
        throw error;
    }
}

// ==============================
// قالب البريد الإلكتروني
// ==============================
function buildEmailTemplate(options: {
    title: string;
    message: string;
    actionUrl?: string;
}): string {
    const { title, message, actionUrl } = options;
    const year = new Date().getFullYear();

    return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #3b82f6; margin: 0;">ثناوي</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px;">${title}</h2>
        <p style="color: #4b5563; margin: 0; line-height: 1.5;">${message}</p>
      </div>
      ${actionUrl
            ? `<div style="text-align: center; margin: 20px 0;">
             <a href="${actionUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">عرض التفاصيل</a>
           </div>`
            : ''
        }
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
        <p>تم إرسال هذه الرسالة من منصة ثناوي التعليمية</p>
        <p>© ${year} جميع الحقوق محفوظة</p>
      </div>
    </div>
  `;
}
