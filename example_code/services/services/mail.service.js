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
  const secure = String(config.SMTP_SECURE) === 'true';
  const user = config.SMTP_USER;
  const pass = config.SMTP_PASS;
  const from = config.MAIL_FROM;

  if (!host || !user || !pass || !from) {
    console.warn("⚠️ SMTP configuration missing in .env. Skipping real mail dispatch.");
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
    from: `"PRIXO" <${from}>`,
    to: toEmail,
    subject,
    html,
    text: text || undefined,
  });

  return info;
}

/**
 * Generates an HTML email for OTP verification (Login, Signup, or Device Pairing).
 * @param {Object} params
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.purpose="Verification"] - Purpose of OTP (e.g., "Account Signup", "Device Pairing")
 */
export function generateOtpEmail({ otp, purpose = "Verification" }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRIXO OTP Verification</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
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
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
        letter-spacing: 12px;
        color: #38bdf8;
        text-align: center;
        background-color: #0f172a;
        border: 2px dashed #38bdf8;
        border-radius: 10px;
        padding: 18px;
        margin: 22px 0;
      }
      .note {
        font-size: 13px;
        color: #94a3b8;
        background: rgba(37, 99, 235, 0.1);
        border: 1px solid rgba(56, 189, 248, 0.2);
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
        <h1>🔒 PRIXO ${purpose}</h1>
      </div>
      <div class="email-body">
        <p style="font-size: 15px; color: #f8fafc; margin-top: 0;">Hello,</p>
        <p>Use the one-time verification code below for your <strong>${purpose}</strong> request:</p>
        
        <div class="otp-box">${otp}</div>

        <div class="note">
          ⏱️ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </div>
        
        <p style="margin-top: 24px; color: #f8fafc;">Best regards,<br><strong>The PRIXO Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} PRIXO Printing Network. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends an OTP email directly.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.purpose="Verification"] - Reason for OTP
 */
export async function sendOtpEmail({ toEmail, otp, purpose = "Verification" }) {
  const html = generateOtpEmail({ otp, purpose });
  return await sendMail({
    toEmail,
    subject: `Your PRIXO ${purpose} Code: ${otp}`,
    html,
    text: `Your PRIXO ${purpose} code is: ${otp}. It expires in 10 minutes.`,
  });
}

/**
 * Generates an HTML welcome onboarding email for newly registered vendors.
 * @param {Object} params
 * @param {string} params.name - Vendor's name
 * @param {string} params.email - Vendor's registered email
 */
export function generateWelcomeEmail({ name, email }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PRIXO</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
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
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
        <h1>🖨️ Welcome to PRIXO</h1>
      </div>
      <div class="email-body">
        <h2 class="welcome-title">Hello ${name || 'Vendor Partner'},</h2>
        <p>Welcome to <strong>PRIXO</strong> — your automated cloud-to-hardware print management platform.</p>
        
        <div class="user-card">
          <p><strong>Vendor Name:</strong> ${name}</p>
          <p><strong>Registered Email:</strong> ${email}</p>
        </div>

        <p>Your vendor account is now set up! Next steps to start receiving live print orders:</p>
        <ol class="steps-list">
          <li><strong>Install PRIXO Print Agent:</strong> Download and run the desktop agent on your shop PC.</li>
          <li><strong>Connect Your Machine:</strong> Enter your device pairing code into the agent app to link your printers.</li>
          <li><strong>Start Receiving Orders:</strong> Customer orders will automatically route to your physical printers.</li>
        </ol>

        <p>If you have any questions or need setup help, our support team is here for you.</p>
        
        <p style="margin-top: 24px; color: #f8fafc;">Best regards,<br><strong>The PRIXO Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} PRIXO Printing Network. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Sends a welcome onboarding email directly.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.name - Vendor name
 */
export async function sendWelcomeEmail({ toEmail, name }) {
  const html = generateWelcomeEmail({ name, email: toEmail });
  return await sendMail({
    toEmail,
    subject: "Welcome to PRIXO — Let's Get Your Printers Connected!",
    html,
    text: `Hello ${name}, welcome to PRIXO! Your vendor account is active. Connect your desktop agent to start accepting orders.`,
  });
}