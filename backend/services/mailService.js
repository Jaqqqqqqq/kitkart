const nodemailer = require('nodemailer');

function hasMailtrapConfig() {
  return Boolean(
    process.env.MAILTRAP_HOST &&
      process.env.MAILTRAP_PORT &&
      process.env.MAILTRAP_USER &&
      process.env.MAILTRAP_PASS
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: Number(process.env.MAILTRAP_PORT),
    secure: Number(process.env.MAILTRAP_PORT) === 465,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });
}

async function sendTransactionUpdateEmail({ to, subject, html, attachments = [] }) {
  if (!hasMailtrapConfig()) {
    console.warn('Mailtrap email skipped: missing MAILTRAP_* environment variables.');
    return { skipped: true };
  }

  const transporter = createTransporter();

  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'KitKart <no-reply@kitkart.test>',
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = {
  sendTransactionUpdateEmail,
};
