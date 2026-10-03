import nodemailer from 'nodemailer';
import config from '../config/config.js';

/**
 * Sends an email using the configured SMTP server.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - HTML body content
 * @param {string} [params.text] - Optional plain text alternative
 */
export async function sendMail({ toEmail, subject, html, text }) {
  const host = config.SMTP_HOST;
  const port = Number(config.SMTP_PORT);
  const secure = Boolean(config.SMTP_SECURE);
  const user = config.SMTP_USER;
  const pass = config.SMTP_PASS;
  const from = config.MAIL_FROM;

  if (!host || !user || !pass || !from) {
    console.warn("⚠️ SMTP credentials not configured in environment. Skipping email dispatch to:", toEmail);
    return { skipped: true, toEmail, subject };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    html,
    text: text || undefined,
  });

  return info;
}

/**
 * Generates an HTML email for OTP verification.
 * @param {Object} params
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.purpose="Verification"] - Purpose of OTP
 */
export function generateOtpEmail({ otp, purpose = "Verification" }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sports Club - OTP Verification</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0b1120;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 520px;
        margin: 30px auto;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        padding: 28px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .email-body {
        padding: 30px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .otp-box {
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 10px;
        color: #34d399;
        text-align: center;
        background-color: #0f172a;
        border: 2px dashed #10b981;
        border-radius: 10px;
        padding: 18px;
        margin: 22px 0;
      }
      .note {
        font-size: 13px;
        color: #94a3b8;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        padding: 10px 14px;
        border-radius: 6px;
      }
      .footer {
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🔒 ${purpose} Code</h1>
      </div>
      <div class="email-body">
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">Hello,</p>
        <p>Use the one-time verification code below for your <strong>${purpose}</strong> request:</p>
        
        <div class="otp-box">${otp}</div>

        <div class="note">
          ⏱️ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </div>
        
        <p style="margin-top: 24px; color: #f8fafc;">Best regards,<br><strong>Sports Club Platform Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Sports Club Platform. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends an OTP email directly.
 */
export async function sendOtpEmail({ toEmail, otp, purpose = "Verification" }) {
  const html = generateOtpEmail({ otp, purpose });
  return await sendMail({
    toEmail,
    subject: `Your Verification Code: ${otp}`,
    html,
    text: `Your ${purpose} code is: ${otp}. It expires in 10 minutes.`,
  });
}

/**
 * Generates an HTML welcome onboarding email.
 * @param {Object} params
 * @param {string} params.name - User's name
 * @param {string} params.email - User's email
 * @param {string} [params.clubName] - Optional sports club name
 */
export function generateWelcomeEmail({ name, email, clubName = 'Sports Club' }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${clubName}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0b1120;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 600px;
        margin: 30px auto;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        padding: 32px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .email-body {
        padding: 32px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .welcome-title {
        font-size: 19px;
        font-weight: 600;
        color: #f8fafc;
        margin-top: 0;
      }
      .user-card {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px 20px;
        margin: 20px 0;
      }
      .user-card p {
        margin: 6px 0;
        font-size: 14px;
      }
      .user-card strong {
        color: #93c5fd;
      }
      .steps-list {
        padding-left: 20px;
        margin: 16px 0;
        color: #94a3b8;
      }
      .steps-list li {
        margin-bottom: 8px;
      }
      .footer {
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🏅 Welcome to ${clubName}</h1>
      </div>
      <div class="email-body">
        <h2 class="welcome-title">Hello ${name || 'Member'},</h2>
        <p>Welcome to <strong>${clubName}</strong> — your modern sports club management and court booking platform.</p>
        
        <div class="user-card">
          <p><strong>Account Name:</strong> ${name}</p>
          <p><strong>Registered Email:</strong> ${email}</p>
        </div>

        <p>Your account is ready! Here is what you can do right now:</p>
        <ol class="steps-list">
          <li><strong>Explore Facilities & Courts:</strong> View real-time availability for badminton, tennis, squash, and more.</li>
          <li><strong>Instant Bookings:</strong> Reserve your preferred court slot and invite fellow members.</li>
          <li><strong>Manage Memberships:</strong> Track subscriptions, passes, and training sessions easily.</li>
        </ol>

        <p style="margin-top: 24px; color: #f8fafc;">See you on the court!<br><strong>${clubName} Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} ${clubName}. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a welcome onboarding email directly.
 */
export async function sendWelcomeEmail({ toEmail, name, clubName = 'Sports Club' }) {
  const html = generateWelcomeEmail({ name, email: toEmail, clubName });
  return await sendMail({
    toEmail,
    subject: `Welcome to ${clubName}!`,
    html,
    text: `Hello ${name}, welcome to ${clubName}! Your account is now active.`,
  });
}

/**
 * Generates an HTML court booking confirmation email.
 */
export function generateBookingConfirmationEmail({ memberName, courtName, startTime, endTime, bookingRef }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmed</title>
    <style>
      body {
        margin: 0; padding: 0;
        background-color: #0b1120;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 540px; margin: 30px auto;
        background-color: #1e293b; border: 1px solid #334155;
        border-radius: 12px; overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        padding: 24px; text-align: center; color: white;
      }
      .body { padding: 28px; }
      .details-card {
        background: #0f172a; border: 1px solid #334155;
        border-radius: 8px; padding: 18px; margin: 18px 0;
      }
      .row { display: flex; justify-content: space-between; margin: 8px 0; }
      .label { color: #94a3b8; }
      .val { font-weight: 600; color: #f8fafc; }
      .footer {
        padding: 16px; text-align: center; font-size: 12px; color: #64748b; background: #0f172a;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h2 style="margin:0;">✅ Booking Confirmed!</h2>
      </div>
      <div class="body">
        <p>Hi ${memberName || 'Member'},</p>
        <p>Your court reservation is confirmed. Here are your booking details:</p>
        <div class="details-card">
          <p><strong>Booking Ref:</strong> #${bookingRef || 'N/A'}</p>
          <p><strong>Court:</strong> ${courtName}</p>
          <p><strong>Start:</strong> ${startTime}</p>
          <p><strong>End:</strong> ${endTime}</p>
        </div>
        <p>Please arrive 10 minutes prior to your slot time. Have a great game!</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Sports Club Platform.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a booking confirmation email.
 */
export async function sendBookingConfirmationEmail({ toEmail, memberName, courtName, startTime, endTime, bookingRef }) {
  const html = generateBookingConfirmationEmail({ memberName, courtName, startTime, endTime, bookingRef });
  return await sendMail({
    toEmail,
    subject: `Booking Confirmed: ${courtName} (#${bookingRef})`,
    html,
    text: `Booking confirmed for ${courtName} from ${startTime} to ${endTime}. Ref: #${bookingRef}`,
  });
}

/**
 * Generates an HTML password reset email.
 */
export function generatePasswordResetEmail({ name, resetLink }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
      body {
        margin: 0; padding: 0;
        background-color: #0b1120;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 520px; margin: 30px auto;
        background-color: #1e293b; border: 1px solid #334155;
        border-radius: 12px; overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        padding: 24px; text-align: center; color: white;
      }
      .body { padding: 28px; }
      .btn {
        display: inline-block; background-color: #ef4444; color: white;
        padding: 12px 24px; text-decoration: none; border-radius: 6px;
        font-weight: 600; margin: 20px 0;
      }
      .footer { padding: 16px; text-align: center; font-size: 12px; color: #64748b; background: #0f172a; }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h2 style="margin:0;">🔑 Reset Your Password</h2>
      </div>
      <div class="body">
        <p>Hello ${name || 'User'},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center;">
          <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">If you did not request this, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Sports Club Platform.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail({ toEmail, name, resetLink }) {
  const html = generatePasswordResetEmail({ name, resetLink });
  return await sendMail({
    toEmail,
    subject: 'Password Reset Request',
    html,
    text: `Reset your password by visiting: ${resetLink}`,
  });
}

export default {
  sendMail,
  generateOtpEmail,
  sendOtpEmail,
  generateWelcomeEmail,
  sendWelcomeEmail,
  generateBookingConfirmationEmail,
  sendBookingConfirmationEmail,
  generatePasswordResetEmail,
  sendPasswordResetEmail,
};
