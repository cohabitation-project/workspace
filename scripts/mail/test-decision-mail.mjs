// Send ONE test message with the same mail settings the application decision email uses, to check them.
// Run on the server from ~/workspace:   node --env-file=.env scripts/mail/test-decision-mail.mjs you@example.com
import nodemailer from 'nodemailer';
const E = process.env; const to = process.argv[2];
if (!to) { console.error('Say where to send the test: node --env-file=.env scripts/mail/test-decision-mail.mjs you@example.com'); process.exit(1); }
const from = E.COMMONS_MAIL_FROM || E.COMMONS_SMTP_USER;
const t = E.COMMONS_SMTP_URL || (E.COMMONS_SMTP_HOST ? { host: E.COMMONS_SMTP_HOST, port: Number(E.COMMONS_SMTP_PORT || 465), secure: Number(E.COMMONS_SMTP_PORT || 465) === 465, auth: { user: E.COMMONS_SMTP_USER, pass: E.COMMONS_SMTP_PASS } } : null);
if (!t || !from) { console.error('Mail settings are missing in .env (COMMONS_SMTP_HOST, COMMONS_SMTP_USER, COMMONS_SMTP_PASS).'); process.exit(1); }
try { const info = await nodemailer.createTransport(t).sendMail({ from, to, subject: 'Test: Commons application mail', text: 'If you can read this, the Commons can send application decisions by email.' }); console.log('Sent.', info.messageId); }
catch (e) { console.error('Not sent:', e.message); process.exit(1); }
