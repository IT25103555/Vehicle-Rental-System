const nodemailer = require('nodemailer');

// Minor Function 4: Email and Notification Services
// (booking confirmation, payment confirmation, cancellation, due-date reminders)
// If SMTP is not configured, we just log to console so the rest of the API
// keeps working in a local/dev environment without crashing.
const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.SMTP_HOST) {
    console.log(`[EMAIL SKIPPED - no SMTP configured] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html
  });

  return { sent: true };
};

module.exports = sendEmail;
