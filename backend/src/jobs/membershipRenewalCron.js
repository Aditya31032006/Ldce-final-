import cron from 'node-cron';
import { pool } from '../config/database.js';
import config from '../config/config.js';
import { sendMail, generateMembershipRenewalEmail } from '../services/mail.service.js';

/**
 * Executes a membership renewal check across all clubs.
 * Scans for memberships expiring within 7 days (specifically at 7, 3, 1, and 0 days remaining).
 * Sends branded, personalized notification emails and records deduplicated entries in app.notifications.
 */
export async function runMembershipRenewalCheck() {
  const startTime = Date.now();
  console.log(`\n⏳ [Membership Cron] Starting daily midnight membership renewal check at ${new Date().toISOString()}...`);

  const summary = {
    totalChecked: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    // Query active memberships with 7, 3, 1, or 0 days remaining
    const expiringQuery = `
      SELECT 
        ms.id AS membership_id,
        ms.club_id,
        ms.member_id,
        ms.plan_id,
        ms.start_date,
        ms.end_date,
        ms.status,
        (ms.end_date - CURRENT_DATE) AS days_left,
        m.first_name,
        m.last_name,
        COALESCE(u.full_name, m.first_name || ' ' || COALESCE(m.last_name, '')) AS member_name,
        COALESCE(u.email, m.email) AS email,
        u.id AS user_id,
        COALESCE(pl.name, 'Club Membership') AS plan_name,
        c.name AS club_name,
        c.slug AS club_slug
      FROM app.memberships ms
      JOIN app.members m ON ms.member_id = m.id
      LEFT JOIN app.users u ON m.user_id = u.id
      JOIN app.clubs c ON ms.club_id = c.id
      LEFT JOIN app.plans pl ON ms.plan_id = pl.id
      WHERE ms.status = 'active'
        AND (ms.end_date - CURRENT_DATE) IN (7, 3, 1, 0)
        AND COALESCE(u.email, m.email) IS NOT NULL
        AND COALESCE(u.email, m.email) != ''
      ORDER BY ms.end_date ASC;
    `;

    const res = await pool.query(expiringQuery);
    summary.totalChecked = res.rows.length;
    console.log(`📋 [Membership Cron] Found ${summary.totalChecked} active membership(s) eligible for renewal reminders.`);

    const todayDate = new Date().toISOString().split('T')[0];

    for (const row of res.rows) {
      const daysLeft = parseInt(row.days_left, 10);
      const dedupeKey = `renewal_${row.membership_id}_${daysLeft}d_${todayDate}`;

      try {
        // 1. Check if a reminder for this membership & milestone was already dispatched today
        const existingCheck = await pool.query(
          "SELECT id FROM app.notifications WHERE dedupe_key = $1 LIMIT 1",
          [dedupeKey]
        );

        if (existingCheck.rows.length > 0) {
          summary.skippedCount++;
          continue;
        }

        // 2. Prepare Email Metadata
        const subject = daysLeft === 0
          ? `⚠️ Urgent: Your ${row.club_name} Membership Expires Today!`
          : daysLeft === 1
            ? `⏰ Action Required: 1 Day Left on Your ${row.club_name} Membership`
            : daysLeft === 3
              ? `⏳ Reminder: 3 Days Left on Your ${row.club_name} Membership`
              : `📅 Reminder: Your ${row.club_name} Membership Renews in 7 Days`;

        const clientBaseUrl = config.clientUrl || 'http://localhost:5173';
        const renewalUrl = `${clientBaseUrl}/club/${row.club_slug || row.club_id}`;

        const html = generateMembershipRenewalEmail({
          memberName: row.member_name || 'Valued Member',
          clubName: row.club_name,
          planName: row.plan_name,
          daysLeft,
          endDate: row.end_date,
          renewalUrl,
        });

        // 3. Dispatch Email via SMTP
        await sendMail({
          toEmail: row.email,
          subject,
          html,
          text: `Hi ${row.member_name}, your ${row.plan_name} membership at ${row.club_name} expires in ${daysLeft} days on ${row.end_date}. Please renew at: ${renewalUrl}`,
        });

        // 4. Record sent notification in database ledger (defense-in-depth deduplication)
        try {
          await pool.query(`
            INSERT INTO app.notifications (
              club_id, channel, recipient_user_id, recipient_member_id, to_address, subject, body, status, sent_at, dedupe_key
            ) VALUES (
              $1, 'email', $2, $3, $4, $5, $6, 'sent', NOW(), $7
            )
          `, [
            row.club_id,
            row.user_id || null,
            row.member_id,
            row.email,
            subject,
            `Membership renewal reminder sent for plan ${row.plan_name} (${daysLeft} days left).`,
            dedupeKey,
          ]);
        } catch (dbErr) {
          console.warn('⚠️ Could not log reminder in app.notifications:', dbErr.message);
        }

        summary.sentCount++;
        console.log(`✉️  [Membership Cron] Renewal email sent to ${row.email} (${daysLeft} days left)`);
      } catch (itemErr) {
        summary.failedCount++;
        summary.errors.push({ email: row.email, error: itemErr.message });
        console.error(`❌ [Membership Cron] Failed to send reminder to ${row.email}:`, itemErr.message);
      }
    }
  } catch (error) {
    console.error('💥 [Membership Cron] Fatal error during renewal cron run:', error);
    summary.fatalError = error.message;
  }

  const durationMs = Date.now() - startTime;
  console.log(`✅ [Membership Cron] Completed in ${durationMs}ms. Sent: ${summary.sentCount}, Skipped: ${summary.skippedCount}, Failed: ${summary.failedCount}\n`);

  return summary;
}

/**
 * Initializes the automated midnight cron job.
 * Runs every day at midnight (00:00).
 */
export function initMembershipRenewalCron() {
  // Pattern: '0 0 * * *' = At 00:00 (midnight) every day
  const cronSchedule = '0 0 * * *';

  console.log('⏰ [Membership Cron] Initializing daily midnight membership renewal scheduler (00:00 every day)...');

  cron.schedule(cronSchedule, async () => {
    console.log('🌙 [Membership Cron] Midnight trigger triggered! Running renewal checks...');
    await runMembershipRenewalCheck();
  }, {
    timezone: 'Asia/Kolkata', // Local IST timezone
  });

  console.log('✅ [Membership Cron] Scheduler registered successfully.');
}

export default {
  initMembershipRenewalCron,
  runMembershipRenewalCheck,
};
