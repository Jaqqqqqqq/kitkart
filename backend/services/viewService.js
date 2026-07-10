const fs = require('fs');
const path = require('path');

const frontendPath = path.resolve(__dirname, '..', '..', 'frontend');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function renderPage(res, page, data = {}, statusCode = 200) {
  const filePath = path.join(frontendPath, `${page}.html`);
  let html = fs.readFileSync(filePath, 'utf8');

  Object.keys(data).forEach((key) => {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(data[key]));
    html = html.replaceAll(`{{{${key}}}}`, String(data[key] ?? ''));
  });

  html = html.replace(/{{{[^}]+}}}/g, '');
  html = html.replace(/{{[^}]+}}/g, '');

  return res.status(statusCode).send(html);
}

module.exports = {
  escapeHtml,
  money,
  renderPage,
};
