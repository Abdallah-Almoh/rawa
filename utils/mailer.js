'use strict';

const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

async function sendMail({ to, subject, html, text }) {
  const transport = createTransport();
  const from = process.env.MAIL_FROM || 'no-reply@example.com';
  return transport.sendMail({ from, to, subject, html, text });
}

function buildVerificationEmail({ username, code }) {
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Verification Code</h2>
      <p>Hello ${username || ''},</p>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:4px;">${code}</h1>
      <p>This code will expire in 15 minutes.</p>
    </div>
  `;
  const text = `Your verification code is ${code}. It expires in 15 minutes.`;
  return { html, text, subject: 'Your verification code' };
}

module.exports = { sendMail, buildVerificationEmail };


