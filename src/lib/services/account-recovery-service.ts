import { prisma } from '@/lib/db';
import { sendEmailNotification, sendSMSNotification, sendMultiChannelNotification } from '@/lib/notification-sender';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { PhoneVerificationService } from './phone-verification-service';

/**
 * ط®ط¯ظ…ط© ط§ط³طھط±ط¯ط§ط¯ ط§ظ„ط­ط³ط§ط¨ ط§ظ„ظ…ط­ط³ظ‘ظ†ط©
 */
export class AccountRecoveryService {
  private static readonly MAX_SECURITY_QUESTIONS = 3;
  private static readonly MIN_REQUIRED_QUESTIONS = 1;

  /**
   * Hash answer for secure storage
   */
  private static hashAnswer(answer: string): string {
    return crypto.createHash('sha256').update(answer.toLowerCase().trim()).digest('hex');
  }

  /**
   * Verify answer
   */
  private static verifyAnswer(inputAnswer: string, hashedAnswer: string): boolean {
    const inputHash = this.hashAnswer(inputAnswer);
    return crypto.timingSafeEqual(
      Buffer.from(inputHash),
      Buffer.from(hashedAnswer)
    );
  }

  /**
   * Set security questions for a user
   */
  static async setSecurityQuestions(
    userId: string,
    questions: Array<{ question: string; answer: string }>
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (questions.length < this.MIN_REQUIRED_QUESTIONS) {
        return {
          success: false,
          message: `يجب إضافة على الأقل ${this.MIN_REQUIRED_QUESTIONS} سؤال أمان`,
        };
      }

      if (questions.length > this.MAX_SECURITY_QUESTIONS) {
        return {
          success: false,
          message: `يمكن إضافة حتى ${this.MAX_SECURITY_QUESTIONS} أسئلة أمان فقط`,
        };
      }

      // Validate all questions have content
      for (const q of questions) {
        if (!q.question?.trim() || !q.answer?.trim()) {
          return {
            success: false,
            message: 'جميع الأسئلة والأجوبة مطلوبة',
          };
        }
      }

      // Delete existing questions
      await prisma.securityQuestion.deleteMany({
        where: { userId },
      });

      // Create new questions
      await prisma.securityQuestion.createMany({
        data: questions.map((q, index) => ({
          userId,
          question: q.question.trim(),
          answerHash: this.hashAnswer(q.answer),
          order: index,
        })),
      });

      logger.info(`Security questions set for user ${userId}`);

      return {
        success: true,
        message: 'تم حفظ أسئلة الأمان بنجاح',
      };
    } catch (error) {
      logger.error('Error setting security questions:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء حفظ أسئلة الأمان',
      };
    }
  }

  /**
   * Get security questions for a user (without answers)
   */
  static async getSecurityQuestions(userId: string): Promise<{
    success: boolean;
    questions?: Array<{ id: string; question: string; order: number }>;
    message?: string;
  }> {
    try {
      const questions = await prisma.securityQuestion.findMany({
        where: { userId },
        select: {
          id: true,
          question: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      });

      return {
        success: true,
        questions,
      };
    } catch (error) {
      logger.error('Error getting security questions:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب أسئلة الأمان',
      };
    }
  }

  /**
   * Verify security questions answers
   */
  static async verifySecurityQuestions(
    userId: string,
    answers: Array<{ questionId: string; answer: string }>
  ): Promise<{
    success: boolean;
    message: string;
    correctCount?: number;
    totalCount?: number;
  }> {
    try {
      const userQuestions = await prisma.securityQuestion.findMany({
        where: { userId },
        orderBy: { order: 'asc' },
      });

      if (userQuestions.length === 0) {
        return {
          success: false,
          message: 'لا توجد أسئلة أمان مسجلة لهذا الحساب',
        };
      }

      if (answers.length !== userQuestions.length) {
        return {
          success: false,
          message: 'يجب الإجابة على جميع أسئلة الأمان',
        };
      }

      let correctCount = 0;
      for (const userQuestion of userQuestions) {
        const answer = answers.find(a => a.questionId === userQuestion.id);
        if (answer && this.verifyAnswer(answer.answer, userQuestion.answerHash)) {
          correctCount++;
        }
      }

      // Require at least 80% correct answers
      const requiredCorrect = Math.ceil(userQuestions.length * 0.8);
      const isVerified = correctCount >= requiredCorrect;

      return {
        success: isVerified,
        message: isVerified
          ? 'تم التحقق من أسئلة الأمان بنجاح'
          : `إجابات غير صحيحة. يجب الإجابة بشكل صحيح على ${requiredCorrect} من ${userQuestions.length} أسئلة على الأقل`,
        correctCount,
        totalCount: userQuestions.length,
      };
    } catch (error) {
      logger.error('Error verifying security questions:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء التحقق من أسئلة الأمان',
      };
    }
  }

  /**
   * Initiate multi-factor account recovery
   */
  static async initiateRecovery(
    email: string,
    recoveryMethod: 'email' | 'phone' | 'questions' | 'multi'
  ): Promise<{
    success: boolean;
    message: string;
    recoveryToken?: string;
    requiresVerification?: boolean;
    verificationMethods?: string[];
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          phone: true,
          phoneVerified: true,
          securityQuestions: {
            select: { id: true, question: true, order: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: 'إذا كان بريدك الإلكتروني مسجلاً لدينا، ستتلقى تعليمات الاسترداد',
          requiresVerification: false,
        };
      }

      // Generate recovery token
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save recovery token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: recoveryToken,
          resetTokenExpires: expiresAt,
        },
      });

      const verificationMethods: string[] = [];

      // Determine available verification methods
      if (recoveryMethod === 'email' || recoveryMethod === 'multi') {
        verificationMethods.push('email');
      }

      if (
        (recoveryMethod === 'phone' || recoveryMethod === 'multi') &&
        user.phone &&
        user.phoneVerified
      ) {
        verificationMethods.push('phone');
      }

      if (
        (recoveryMethod === 'questions' || recoveryMethod === 'multi') &&
        user.securityQuestions.length > 0
      ) {
        verificationMethods.push('questions');
      }

      // Send recovery instructions via email
      if (verificationMethods.includes('email')) {
        const recoveryLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/recover-account?token=${recoveryToken}`;

        await sendEmailNotification({
          to: user.email,
          subject: 'استرداد حسابك في منصة ثانوي',
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>استرداد الحساب</h2>
              <p>تم طلب استرداد حسابك. استخدم الرابط التالي لإعادة تعيين كلمة المرور:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${recoveryLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">استرداد الحساب</a>
              </div>
              <p>أو يمكنك نسخ الرابط التالي:</p>
              <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${recoveryLink}</p>
              <p>صلاحية الرابط ساعة واحدة. إذا لم تطلب هذا الرابط، يرجى تجاهل هذه الرسالة.</p>
            </div>
          `,
        });
      }

      // Send SMS if phone verification is available
      if (verificationMethods.includes('phone') && user.phone) {
        // Send OTP via SMS
        await PhoneVerificationService.sendOTP(user.id, user.phone);
      }

      logger.info(`Account recovery initiated for user ${user.id} via ${recoveryMethod}`);

      return {
        success: true,
        message: 'تم إرسال تعليمات الاسترداد',
        recoveryToken,
        requiresVerification: verificationMethods.length > 1,
        verificationMethods,
      };
    } catch (error) {
      logger.error('Error initiating account recovery:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء بدء عملية الاسترداد',
      };
    }
  }

  /**
   * Complete multi-factor account recovery
   */
  static async completeRecovery(
    recoveryToken: string,
    newPassword: string,
    verifications?: {
      emailCode?: string;
      phoneOTP?: string;
      securityAnswers?: Array<{ questionId: string; answer: string }>;
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Find user by recovery token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: recoveryToken,
          resetTokenExpires: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          email: true,
          phone: true,
          phoneVerified: true,
          securityQuestions: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'رمز الاسترداد غير صالح أو منتهي الصلاحية',
        };
      }

      // Verify all required verification methods
      const verificationResults: boolean[] = [];

      if (verifications?.phoneOTP && user.phone) {
        const phoneResult = await PhoneVerificationService.verifyOTPCode(user.id, verifications.phoneOTP);
        verificationResults.push(phoneResult.success && phoneResult.verified === true);
      }

      if (verifications?.securityAnswers && user.securityQuestions.length > 0) {
        const questionsResult = await this.verifySecurityQuestions(user.id, verifications.securityAnswers);
        verificationResults.push(questionsResult.success);
      }

      // If email code is provided, verify it (would need email OTP service)
      // For now, we'll rely on the recovery token itself as email verification

      // Require at least one verification method if multiple are available
      if (verificationResults.length > 0 && !verificationResults.some(r => r)) {
        return {
          success: false,
          message: 'فشل التحقق. يرجى التأكد من صحة جميع المعلومات المقدمة',
        };
      }

      // Hash new password
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear recovery token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpires: null,
          passwordChangedAt: new Date(),
        },
      });

      // Send notification via multiple channels
      await sendMultiChannelNotification({
        userId: user.id,
        title: 'تم تغيير كلمة المرور',
        message: 'تم تغيير كلمة المرور بنجاح. إذا لم تقم بهذا الإجراء، يرجى الاتصال بالدعم فوراً.',
        type: 'warning',
        channels: ['app', 'email', 'sms'],
      });

      logger.info(`Account recovery completed for user ${user.id}`);

      return {
        success: true,
        message: 'تم استرداد الحساب وتغيير كلمة المرور بنجاح',
      };
    } catch (error) {
      logger.error('Error completing account recovery:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء استرداد الحساب',
      };
    }
  }
}

