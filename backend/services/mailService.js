const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

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

function buildTransactionUpdateEmail({ order, status }) {
  const safeOrderId = escapeHtml(order.id);
  const safeStatus = escapeHtml(status);
  const customerName = escapeHtml(`${order.first_name || ''} ${order.last_name || ''}`.trim());
  const paymentMethod = escapeHtml(order.payment_method || 'Not specified');
  const total = escapeHtml(formatCurrency(order.total));
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const normalizedStatus = String(status).toLowerCase();
  const statusColor = normalizedStatus === 'cancelled' ? '#dc2626' : '#0f766e';
  const statusBg = normalizedStatus === 'cancelled' ? '#fee2e2' : '#ecfdf5';

  return `
    <div style="margin:0;background:#eef4fb;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#102033;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;background:#ffffff;border:1px solid #d9e4ef;border-radius:18px;overflow:hidden;box-shadow:0 18px 44px rgba(15,23,42,0.12);">
              <tr>
                <td style="background:#0f766e;padding:28px 32px;color:#ffffff;">
                  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">KitKart Receipt</div>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:800;">Order status updated</h1>
                  <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#d9fffb;">Order #${safeOrderId} has a new transaction update.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px 26px;">
                  <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hello ${customerName || 'there'},</p>
                  <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#475569;">Your KitKart order has been updated. We attached the refreshed PDF receipt so you can keep a clean copy for your records.</p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#f8fafc;border:1px solid #d9e4ef;border-radius:14px;overflow:hidden;margin:0 0 22px;">
                    <tr>
                      <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order</td>
                      <td align="right" style="padding:16px 18px;border-bottom:1px solid #e2e8f0;color:#102033;font-size:15px;font-weight:800;">#${safeOrderId}</td>
                    </tr>
                    <tr>
                      <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Status</td>
                      <td align="right" style="padding:16px 18px;border-bottom:1px solid #e2e8f0;"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${statusBg};color:${statusColor};font-size:13px;font-weight:800;">${safeStatus}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Payment</td>
                      <td align="right" style="padding:16px 18px;border-bottom:1px solid #e2e8f0;color:#102033;font-size:14px;font-weight:700;">${paymentMethod}</td>
                    </tr>
                    <tr>
                      <td style="padding:16px 18px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total</td>
                      <td align="right" style="padding:16px 18px;color:#102033;font-size:18px;font-weight:900;">${total}</td>
                    </tr>
                  </table>

                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:15px 18px;color:#9a3412;font-size:13px;line-height:1.6;">
                    The attached PDF includes ${itemCount} item${itemCount === 1 ? '' : 's'}, quantities, item statuses, and the order total.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px;background:#f1f5f9;border-top:1px solid #d9e4ef;color:#64748b;font-size:12px;line-height:1.6;">
                  Thank you for shopping with KitKart. If anything looks wrong, reply to this email so we can help.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
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
  buildTransactionUpdateEmail,
  sendTransactionUpdateEmail,
};
