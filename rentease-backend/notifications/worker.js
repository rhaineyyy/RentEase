'use strict';

require('dotenv').config();

const pool = require('../db');
const nodemailer = require('nodemailer');
const { normalizePhone, allowed } = require('./validation');
const { reminderSQL, eligible } = require('./reminders');

let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
});

process.on('SIGTERM', () => {
  stopping = true;
});

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 15000,
  socketTimeout: 20000
});

async function mark(id, status, code = null, providerId = null) {
  await pool.query(
    `UPDATE notification_outbox
     SET status = $2,
         error_code = $3,
         provider_id = $4,
         processed_at = now()
     WHERE notification_id = $1`,
    [id, status, code, providerId]
  );

  console.log(
    'Notification:',
    id,
    '| Status:',
    status,
    '| Code:',
    code || 'none'
  );
}

async function sendSMS(job, destination) {
  const apiKey = process.env.TEXTBEE_API_KEY?.trim();
  const deviceId = process.env.TEXTBEE_DEVICE_ID?.trim();

  if (!apiKey || !deviceId) {
    return mark(
      job.notification_id,
      'failed',
      'textbee_config_missing'
    );
  }

  // normalizePhone returns a number such as 639XXXXXXXXX.
  // TextBee requires the international format +639XXXXXXXXX.
  const phone = destination.startsWith('+')
    ? destination
    : `+${destination}`;

  const response = await fetch(
    'https://api.textbee.dev/api/v1/gateway/send-sms',
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId,
        recipients: [phone],
        message: job.body
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    return mark(
      job.notification_id,
      'unknown',
      'textbee_invalid_response'
    );
  }

  if (response.ok && data.data?.success === true) {
    return mark(
      job.notification_id,
      'accepted',
      null,
      data.data.smsBatchId || null
    );
  }

  // An ambiguous response might occur after a message was queued.
  // Do not automatically resend it.
  const status =
    response.ok || response.status >= 500
      ? 'unknown'
      : 'failed';

  return mark(
    job.notification_id,
    status,
    `textbee_${response.status}`
  );
}

async function sendEmail(job, destination) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    return mark(
      job.notification_id,
      'failed',
      'email_config_missing'
    );
  }

  const result = await transport.sendMail({
    from: {
      name: 'RentEase',
      address: process.env.EMAIL_FROM
    },
    to: destination,
    subject: `RentEase - ${job.subject}`,
    text: job.body
  });

  const accepted = result.accepted?.length > 0;

  return mark(
    job.notification_id,
    accepted ? 'accepted' : 'failed',
    accepted ? null : 'smtp_rejected',
    result.messageId || null
  );
}

async function deliver(job) {
  if (!(await eligible(pool, job))) {
    return mark(
      job.notification_id,
      'skipped',
      'reminder_no_longer_due'
    );
  }

  const result = await pool.query(
    `SELECT
       u.account_status,
       u.email,
       COALESCE(NULLIF(trim(p.mobile), ''), u.phone) AS mobile
     FROM app_users u
     LEFT JOIN user_profile_contacts p
       ON p.user_id = u.user_id
     WHERE u.user_id = $1`,
    [job.recipient_id]
  );

  const person = result.rows[0];

  if (!person) {
    return mark(
      job.notification_id,
      'skipped',
      'missing_recipient'
    );
  }

  if (
    String(person.account_status).toLowerCase() !== 'active' &&
    job.event_type !== 'account_rejected'
  ) {
    return mark(
      job.notification_id,
      'skipped',
      'inactive_recipient'
    );
  }

  if (!['sms', 'email'].includes(job.channel)) {
    return mark(
      job.notification_id,
      'failed',
      'unsupported_channel'
    );
  }

  const isSMS = job.channel === 'sms';

  const destination = isSMS
    ? normalizePhone(person.mobile)
    : person.email?.trim().toLowerCase();

  if (!destination) {
    return mark(
      job.notification_id,
      'skipped',
      'missing_contact'
    );
  }

  const testMode =
    process.env.NOTIFICATIONS_TEST_MODE !== 'false';

  const allowlist = isSMS
    ? process.env.SMS_ALLOWED_NUMBERS
    : process.env.EMAIL_ALLOWED_RECIPIENTS;

  if (
    testMode &&
    !allowed(destination, allowlist, isSMS)
  ) {
    return mark(
      job.notification_id,
      'skipped',
      'not_allowlisted'
    );
  }

  if (isSMS) {
    return sendSMS(job, destination);
  }

  return sendEmail(job, destination);
}

async function main() {
  console.log(
    'RentEase notification worker started. Test allowlists:',
    process.env.NOTIFICATIONS_TEST_MODE !== 'false'
  );

  console.log('SMS provider: TextBee');

  // Verify the required migration and contact column.
  await pool.query(
    'SELECT notification_id, dedupe_key FROM notification_outbox LIMIT 0'
  );

  await pool.query(
    'SELECT mobile FROM user_profile_contacts LIMIT 0'
  );

  let nextReminderCheck = 0;

  while (!stopping) {
    if (
      process.env.NOTIFICATIONS_REMINDERS_ENABLED === 'true' &&
      Date.now() >= nextReminderCheck
    ) {
      const queued = await pool.query(reminderSQL);

      if (queued.rows.length) {
        console.log(
          'Queued reminder channels:',
          queued.rows.length
        );
      }

      nextReminderCheck = Date.now() + 60000;
    }

    const { rows } = await pool.query(
      `UPDATE notification_outbox
       SET status = 'sending',
           processed_at = now()
       WHERE notification_id = (
         SELECT notification_id
         FROM notification_outbox
         WHERE status = 'pending'
         ORDER BY notification_id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`
    );

    if (!rows.length) {
      await sleep(2000);
      continue;
    }

    const job = rows[0];

    try {
      await deliver(job);
    } catch (error) {
      // A timeout may occur after the provider accepted a message.
      // Mark it unknown to avoid an automatic duplicate send.
      const code = String(
        error.code || error.name || 'send_error'
      ).slice(0, 80);

      await mark(
        job.notification_id,
        'unknown',
        code
      );
    }
  }
}

main()
  .catch(error => {
    console.error(
      'Worker stopped:',
      error.code || error.name,
      'Check migration, database and config.'
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    transport.close();
    await pool.end();
  });