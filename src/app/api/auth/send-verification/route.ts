
import { NextRequest, NextResponse } from 'next/server';

// This would normally use a service like Twilio for SMS and SendGrid/Nodemailer for email
// For this example, we'll simulate the sending process

export async function POST(request: NextRequest) {
  try {
    const { type, email, phone } = await request.json();

    if (!type || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Type and at least one contact method (email or phone) are required' },
        { status: 400 }
      );
    }

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // In a real application, you would:
    // 1. Store this verification code in your database with an expiration time
    // 2. Send the actual email/SMS using a service like Twilio or SendGrid

    if (type === 'email' && email) {
      // Simulate sending email verification
      console.log(`Email verification code ${verificationCode} sent to ${email}`);

      // In a real app, you would use something like:
      // await sendEmail({
      //   to: email,
      //   subject: 'رمز التحقق لحسابك',
      //   text: `رمز التحقق الخاص بك هو: ${verificationCode}`,
      //   html: `<p>رمز التحقق الخاص بك هو: <strong>${verificationCode}</strong></p>`
      // });
    } else if (type === 'phone' && phone) {
      // Simulate sending SMS verification
      console.log(`SMS verification code ${verificationCode} sent to ${phone}`);

      // In a real app, you would use something like:
      // await sendSMS({
      //   to: phone,
      //   body: `رمز التحقق الخاص بك هو: ${verificationCode}`
      // });
    }

    // For demonstration purposes, we'll just return the verification code
    // In production, you should NOT return the code - just confirm it was sent
    return NextResponse.json({
      message: `Verification code sent to ${type === 'email' ? email : phone}`,
      code: verificationCode // Remove this in production
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
