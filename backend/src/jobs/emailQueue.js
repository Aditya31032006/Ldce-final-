import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { sendOtpEmail } from '../services/mail.service.js';

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
  retryStrategy: () => null, // Don't loop retrying if Redis is not running
};


/**
 * Initializes BullMQ Worker if Redis is online.
 * Gracefully disables worker and falls back to direct SMTP dispatch if Redis is offline.
 */
export async function initEmailWorker() {
  if (emailWorker) return emailWorker;

  try {
    // Probe Redis connectivity with 1s timeout
    const probe = new Redis({
      ...bullConnection,
      connectTimeout: 1000,
      lazyConnect: false,
      retryStrategy: () => null,
    });

    probe.on('error', () => {}); // swallow probe error

    await new Promise((resolve, reject) => {
      probe.once('connect', () => resolve(true));
      probe.once('error', (err) => reject(err));
      setTimeout(() => reject(new Error('Connection timed out')), 1200);
    });

    probe.disconnect();

    // Redis is alive -> Initialize BullMQ queue and worker
    isBullAvailable = true;

    emailQueue = new Queue('email-queue', {
      connection: bullConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    emailQueue.on('error', () => {});

    emailWorker = new Worker(
      'email-queue',
      async (job) => {
        const { name, data } = job;
        if (name === 'send-otp-email') {
          const { email, otp, purpose } = data;
          await sendOtpEmail({ toEmail: email, otp, purpose });
        }
      },
      {
        connection: bullConnection,
        concurrency: 5,
      }
    );

    emailWorker.on('completed', (job) => {
      console.log(`📧 [BullMQ] Email delivered (${job.name}) to: ${job.data.email}`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ] Email job failed (${job?.name}): ${err.message}`);
    });

    emailWorker.on('error', (err) => {
      console.warn(`⚠️ [BullMQ] Worker notice: ${err.message}`);
    });

    console.log('⚡ [BullMQ] Redis connected — Email queue worker active.');
    return emailWorker;
  } catch (err) {
    isBullAvailable = false;
    console.log('ℹ️  [BullMQ] Redis is offline. Email queue worker paused — all OTP emails will be sent directly via SMTP.');
    return null;
  }
}

/**
 * Enqueues an OTP email job via BullMQ if Redis is active,
 * otherwise immediately dispatches directly via SMTP.
 */
export const addOtpEmailJob = async ({ email, otp, purpose = 'Password Reset' }) => {
  if (isBullAvailable && emailQueue) {
    try {
      return await emailQueue.add('send-otp-email', { email, otp, purpose });
    } catch (error) {
      console.warn('⚠️ BullMQ queue push failed. Falling back to direct email dispatch:', error.message);
    }
  }

  // Direct dispatch fallback
  return await sendOtpEmail({ toEmail: email, otp, purpose });
};

export default {
  initEmailWorker,
  addOtpEmailJob,
};
