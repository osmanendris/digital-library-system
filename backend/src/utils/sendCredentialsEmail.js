const nodemailer = require('nodemailer');
require('dotenv').config();

// Lazily created so a missing GMAIL_USER/GMAIL_APP_PASSWORD doesn't crash
// the whole app at require-time - it only becomes a problem when we
// actually try to send an email, and even then we fail soft (see below).
let transporter = null;
function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

const ROLE_LABELS = {
  admin: 'System Administrator',
  admin_librarian: 'Admin Librarian',
  department_head: 'Department Head',
  teacher: 'Teacher',
  librarian: 'Librarian',
  staff: 'Staff',
  student: 'Student',
};

// Sends the brand-new account's username (their email) and password to
// that SAME email address, per Q5 ("When someone registers in the system,
// username and password must be delivered in his gmail account.").
// Deliberately fails SOFT: if GMAIL_USER/GMAIL_APP_PASSWORD are not
// configured, or the send fails for any reason (network, bad address...),
// we log a warning and return false rather than throwing - account
// creation itself must never be blocked by an email hiccup.
async function sendCredentialsEmail({ to, full_name, role, password, siteName = 'Digital Library' }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[sendCredentialsEmail] GMAIL_USER/GMAIL_APP_PASSWORD not configured - skipped sending credentials to ${to}.`);
    return false;
  }
  const roleLabel = ROLE_LABELS[role] || role;
  const subject = `Your ${siteName} account has been created`;
  const text =
    `Hello ${full_name},\n\n` +
    `An account has been created for you on ${siteName} as a ${roleLabel}.\n\n` +
    `Username: ${to}\n` +
    `Password: ${password}\n\n` +
    `Please log in and change your password from your Profile Settings as soon as possible.\n\n` +
    `If you were not expecting this account, please contact your administrator.\n`;
  const html =
    `<p>Hello ${full_name},</p>` +
    `<p>An account has been created for you on <strong>${siteName}</strong> as a <strong>${roleLabel}</strong>.</p>` +
    `<p><strong>Username:</strong> ${to}<br/><strong>Password:</strong> ${password}</p>` +
    `<p>Please log in and change your password from your Profile Settings as soon as possible.</p>` +
    `<p style="color:#888;font-size:12px;">If you were not expecting this account, please contact your administrator.</p>`;

  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text, html });
    return true;
  } catch (err) {
    console.warn(`[sendCredentialsEmail] Failed to send credentials to ${to}:`, err.message);
    return false;
  }
}

// Q7: self-service "Forgot Password" - emails a 6-digit OTP the person uses
// to reset their own password, instead of an admin doing it for them.
// Same fail-soft behaviour as sendCredentialsEmail above.
async function sendOtpEmail({ to, full_name, otp, siteName = 'Digital Library' }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[sendOtpEmail] GMAIL_USER/GMAIL_APP_PASSWORD not configured - skipped sending OTP to ${to}.`);
    return false;
  }
  const subject = `${siteName} password reset code`;
  const text =
    `Hello ${full_name},\n\n` +
    `You requested to reset your ${siteName} password.\n\n` +
    `Your one-time code is: ${otp}\n\n` +
    `This code expires in 10 minutes. If you did not request this, you can safely ignore this email.\n`;
  const html =
    `<p>Hello ${full_name},</p>` +
    `<p>You requested to reset your <strong>${siteName}</strong> password.</p>` +
    `<p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p>` +
    `<p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>`;

  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text, html });
    return true;
  } catch (err) {
    console.warn(`[sendOtpEmail] Failed to send OTP to ${to}:`, err.message);
    return false;
  }
}

module.exports = { sendCredentialsEmail, sendOtpEmail };
