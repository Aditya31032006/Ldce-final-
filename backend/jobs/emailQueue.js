import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../src/config/redis.js';
import {
  sendMail,
  generateWelcomeEmail,
  generateOtpEmail,
  generateStaffInvitationEmail,
  generateCompanyInvitationEmail,
  generateQuotationIssuedEmail,
  generateCounterOfferEmail,
  generateQuotationApprovedEmail,
  generateBookingConfirmationEmail,
  generatePasswordResetEmail,
} from '../src/services/mail.service.js';

let isBullAvailable = false;
let emailQueue = null;
let emailWorker = null;

const bullConnection = {
  host: redisConnection.host || '127.0.0.1',
  port: redisConnection.port || 6379,
  username: redisConnection.username,
  password: redisConnection.password || undefined,
  tls: redisConnection.tls,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: () => null, // Don't loop retrying if Redis is offline
};

/**
 * BullMQ Email Queue for offloading email dispatching.
 */
export function getEmailQueue() {
  if (!emailQueue && isBullAvailable) {
    emailQueue = new Queue('email-queue', {
      connection: bullConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 500,
        },
      },
    });
    emailQueue.on('error', () => {});
  }
  return emailQueue;
}

/**
 * Initializes and starts the BullMQ Email Worker if Redis is online.
 * Gracefully activates direct asynchronous SMTP dispatch if Redis is offline.
 */
export async function initEmailWorker() {
  if (emailWorker) {
    return emailWorker;
  }

  try {
    // 1. Probe Redis connectivity with 1s timeout
    const probe = new Redis({
      ...bullConnection,
      connectTimeout: 1000,
      lazyConnect: false,
      retryStrategy: () => null,
    });

    probe.on('error', () => {});

    await new Promise((resolve, reject) => {
      probe.once('connect', () => resolve(true));
      probe.once('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Connection timed out')), 1200);
    });

    probe.disconnect();

    // 2. Redis is online -> initialize Queue & Worker
    isBullAvailable = true;
    getEmailQueue();

    emailWorker = new Worker(
      'email-queue',
      async (job) => {
        const { name, data } = job;

        switch (name) {
          case 'send-welcome-email': {
            const { name: userName, email, clubName } = data;
            const html = generateWelcomeEmail({ name: userName, email, clubName });
            await sendMail({
              toEmail: email,
              subject: `Welcome to ${clubName || 'Sports Club'}! 🏅`,
              html,
            });
            break;
          }

          case 'send-otp-email': {
            const { email, otp, purpose = 'Verification' } = data;
            const html = generateOtpEmail({ otp, purpose });
            await sendMail({
              toEmail: email,
              subject: `Your ${purpose} Code: ${otp} 🔒`,
              html,
            });
            break;
          }

          case 'send-booking-confirmation': {
            const { toEmail, memberName, courtName, startTime, endTime, bookingRef } = data;
            const html = generateBookingConfirmationEmail({
              memberName,
              courtName,
              startTime,
              endTime,
              bookingRef,
            });
            await sendMail({
              toEmail,
              subject: `Booking Confirmed: ${courtName} (#${bookingRef}) 🏸`,
              html,
            });
            break;
          }

          case 'send-password-reset': {
            const { toEmail, name, resetLink } = data;
            const html = generatePasswordResetEmail({ name, resetLink });
            await sendMail({
              toEmail,
              subject: '🔑 Password Reset Request',
              html,
            });
            break;
          }

          case 'send-staff-invitation': {
            const { name: staffName, email, role, tempPassword } = data;
            const html = generateStaffInvitationEmail({ name: staffName, email, role, tempPassword });
            await sendMail({
              toEmail: email,
              subject: `🎉 You've Been Invited to the Club Staff (${role})`,
              html,
            });
            break;
          }

          case 'send-company-invitation': {
            const { name: contactName, email, companyName, tempPassword } = data;
            const html = generateCompanyInvitationEmail({ name: contactName, email, companyName, tempPassword });
            await sendMail({
              toEmail: email,
              subject: `🏢 Account Provisioned for ${companyName}`,
              html,
            });
            break;
          }

          case 'send-quotation-issued': {
            const { toEmail, customerName, quotationNumber, grandTotal, validUntil } = data;
            const html = generateQuotationIssuedEmail({
              customerName,
              quotationNumber,
              grandTotal,
              validUntil,
            });
            await sendMail({
              toEmail,
              subject: `📄 New Quotation Issued: ${quotationNumber}`,
              html,
            });
            break;
          }

          case 'send-counter-offer': {
            const { toEmail, customerName, quotationNumber, counterDiscount, requestedDeliveryDate, message } = data;
            const html = generateCounterOfferEmail({
              customerName,
              quotationNumber,
              counterDiscount,
              requestedDeliveryDate,
              message,
            });
            await sendMail({
              toEmail,
              subject: `💬 New Counter-Offer for Quotation: ${quotationNumber}`,
              html,
            });
            break;
          }

          case 'send-quotation-approved': {
            const { toEmail, customerName, quotationNumber, grandTotal } = data;
            const html = generateQuotationApprovedEmail({
              customerName,
              quotationNumber,
              grandTotal,
            });
            await sendMail({
              toEmail,
              subject: `✅ Quotation Approved: ${quotationNumber}`,
              html,
            });
            break;
          }

          case 'send-generic-mail': {
            const { toEmail, subject, html, text } = data;
            await sendMail({ toEmail, subject, html, text });
            break;
          }

          default:
            throw new Error(`Unknown email job type: ${name}`);
        }
      },
      {
        connection: bullConnection,
        concurrency: 5,
      }
    );

    emailWorker.on('completed', (job) => {
      console.log(`📧 [BullMQ] Email sent successfully (${job.name}) to: ${job.data.email || job.data.toEmail}`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ] Email job FAILED (${job?.name}) to: ${job?.data?.email || job?.data?.toEmail} — Reason: ${err.message}`);
    });

    emailWorker.on('error', (err) => {
      console.warn(`⚠️ [BullMQ] Email worker connection notice: ${err.message}`);
    });

    console.log('⚡ [BullMQ] Redis connected — Background Email Queue Worker active.');
    return emailWorker;
  } catch (err) {
    isBullAvailable = false;
    console.log('ℹ️  [BullMQ] Redis is offline. Direct background asynchronous SMTP dispatch active.');
    return null;
  }
}

// ==================== HELPER DISPATCHERS ====================

/**
 * Enqueues a welcome email job upon user registration.
 */
export const addWelcomeEmailJob = async ({ name, email, clubName = 'Sports Club' }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-welcome-email', { name, email, clubName });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  // Non-blocking async direct dispatch fallback
  setImmediate(async () => {
    try {
      const html = generateWelcomeEmail({ name, email, clubName });
      await sendMail({ toEmail: email, subject: `Welcome to ${clubName}! 🏅`, html });
    } catch (err) {
      console.error('Direct welcome email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a password reset OTP email job.
 */
export const addOtpEmailJob = async ({ email, otp, purpose = 'Password Reset' }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-otp-email', { email, otp, purpose });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  // Non-blocking async direct dispatch fallback
  setImmediate(async () => {
    try {
      const html = generateOtpEmail({ otp, purpose });
      await sendMail({ toEmail: email, subject: `Your ${purpose} Code: ${otp} 🔒`, html });
    } catch (err) {
      console.error('Direct OTP email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a booking confirmation email job.
 */
export const addBookingConfirmationEmailJob = async ({ toEmail, memberName, courtName, startTime, endTime, bookingRef }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-booking-confirmation', { toEmail, memberName, courtName, startTime, endTime, bookingRef });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateBookingConfirmationEmail({ memberName, courtName, startTime, endTime, bookingRef });
      await sendMail({ toEmail, subject: `Booking Confirmed: ${courtName} (#${bookingRef}) 🏸`, html });
    } catch (err) {
      console.error('Direct booking email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a password reset link email job.
 */
export const addPasswordResetEmailJob = async ({ toEmail, name, resetLink }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-password-reset', { toEmail, name, resetLink });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generatePasswordResetEmail({ name, resetLink });
      await sendMail({ toEmail, subject: '🔑 Password Reset Request', html });
    } catch (err) {
      console.error('Direct password reset email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a staff invitation email job.
 */
export const addStaffInvitationJob = async ({ name, email, role, tempPassword }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-staff-invitation', { name, email, role, tempPassword });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateStaffInvitationEmail({ name, email, role, tempPassword });
      await sendMail({ toEmail: email, subject: `🎉 You've Been Invited to the Club Staff (${role})`, html });
    } catch (err) {
      console.error('Direct staff invitation email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a client company invitation email job with temporary credentials.
 */
export const addCompanyInvitationJob = async ({ name, email, companyName, tempPassword }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-company-invitation', { name, email, companyName, tempPassword });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed, falling back to direct background mail dispatch:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateCompanyInvitationEmail({ name, email, companyName, tempPassword });
      await sendMail({ toEmail: email, subject: `🏢 Account Provisioned for ${companyName}`, html });
    } catch (err) {
      console.error('Direct company invitation email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues an email job when a quotation is issued.
 */
export const addQuotationIssuedEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-quotation-issued', data);
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateQuotationIssuedEmail(data);
      await sendMail({ toEmail: data.toEmail, subject: `📄 New Quotation Issued: ${data.quotationNumber}`, html });
    } catch (err) {
      console.error('Direct quotation issued email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues an email job when sales rep submits a counter-offer.
 */
export const addCounterOfferEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-counter-offer', data);
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateCounterOfferEmail(data);
      await sendMail({ toEmail: data.toEmail, subject: `💬 New Counter-Offer for Quotation: ${data.quotationNumber}`, html });
    } catch (err) {
      console.error('Direct counter-offer email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues an email job when a quotation is approved.
 */
export const addQuotationApprovedEmailJob = async (data) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-quotation-approved', data);
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      const html = generateQuotationApprovedEmail(data);
      await sendMail({ toEmail: data.toEmail, subject: `✅ Quotation Approved: ${data.quotationNumber}`, html });
    } catch (err) {
      console.error('Direct quotation approved email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Enqueues a custom generic email job without blocking execution.
 */
export const addGenericEmailJob = async ({ toEmail, subject, html, text }) => {
  const queue = getEmailQueue();
  if (isBullAvailable && queue) {
    try {
      return await queue.add('send-generic-mail', { toEmail, subject, html, text });
    } catch (e) {
      console.warn('⚠️ BullMQ queue add failed:', e.message);
    }
  }

  setImmediate(async () => {
    try {
      await sendMail({ toEmail, subject, html, text });
    } catch (err) {
      console.error('Direct generic email dispatch failed:', err.message);
    }
  });
  return { queued: false, direct: true };
};

/**
 * Retrieves current job counts for monitoring/health check.
 */
export const getQueueStatus = async () => {
  const queue = getEmailQueue();
  if (!queue || !isBullAvailable) {
    return { status: 'fallback-direct', mode: 'immediate-async' };
  }
  try {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return {
      status: 'up',
      ...counts,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
};

export default {
  initEmailWorker,
  getEmailQueue,
  addWelcomeEmailJob,
  addOtpEmailJob,
  addBookingConfirmationEmailJob,
  addPasswordResetEmailJob,
  addStaffInvitationJob,
  addCompanyInvitationJob,
  addQuotationIssuedEmailJob,
  addCounterOfferEmailJob,
  addQuotationApprovedEmailJob,
  addGenericEmailJob,
  getQueueStatus,
};
