import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL  = process.env.APP_URL || 'http://localhost:3000';
const APP_NAME = 'AgileFlow AI';
const FROM     = process.env.SMTP_FROM || `"${APP_NAME}" <noreply@agileflow.ai>`;

function baseTemplate(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:40px 20px}
    .card{max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
    h1{margin:0 0 8px;font-size:22px;color:#111}
    p{color:#555;line-height:1.6;margin:0 0 20px}
    .btn{display:inline-block;background:#4f46e5;color:#fff!important;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px}
    .footer{margin-top:32px;padding-top:24px;border-top:1px solid #f0f0f0;font-size:12px;color:#999}
  </style></head><body><div class="card">
    ${content}
    <div class="footer">\u00a9 ${new Date().getFullYear()} ${APP_NAME}. If you didn't request this, ignore this email.</div>
  </div></body></html>`;
}

export async function sendInviteEmail(to: string, inviterName: string, tenantName: string, token: string) {
  const link = `${APP_URL}/accept-invite?token=${token}`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `You've been invited to ${tenantName} on ${APP_NAME}`,
    html: baseTemplate(`
      <h1>You're invited! \ud83c\udf89</h1>
      <p><strong>${inviterName}</strong> invited you to join <strong>${tenantName}</strong>.</p>
      <p><a class="btn" href="${link}">Accept Invitation</a></p>
      <p style="font-size:13px;color:#999">Link expires in 7 days.</p>
    `)
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `Reset your ${APP_NAME} password`,
    html: baseTemplate(`
      <h1>Reset your password</h1>
      <p>We received a request to reset your password. Click below to set a new one.</p>
      <p><a class="btn" href="${link}">Reset Password</a></p>
      <p style="font-size:13px;color:#999">Link expires in 1 hour.</p>
    `)
  });
}

export async function sendWelcomeEmail(to: string, name: string, tenantName: string) {
  await transporter.sendMail({
    from: FROM, to,
    subject: `Welcome to ${APP_NAME}! \ud83d\ude80`,
    html: baseTemplate(`
      <h1>Welcome, ${name}! \ud83d\udc4b</h1>
      <p>Your workspace <strong>${tenantName}</strong> is ready.</p>
      <p><a class="btn" href="${APP_URL}">Open ${APP_NAME}</a></p>
    `)
  });
}
