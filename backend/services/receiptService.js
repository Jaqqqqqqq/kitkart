const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

function generateReceiptPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      bufferPages: true,
      info: {
        Title: `KitKart Receipt #${order.id}`,
        Author: 'KitKart',
        Subject: 'Order receipt',
      },
    });
    const chunks = [];
    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;
    const accent = '#0f766e';
    const ink = '#0f172a';
    const softInk = '#475569';
    const line = '#cbd5e1';
    const panel = '#f8fafc';

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    function drawRoundedBox(x, y, width, height, fillColor, strokeColor = null) {
      doc.save();
      doc.roundedRect(x, y, width, height, 10).fill(fillColor);
      if (strokeColor) {
        doc.roundedRect(x, y, width, height, 10).lineWidth(1).stroke(strokeColor);
      }
      doc.restore();
    }

    function drawHeader() {
      drawRoundedBox(left, 36, contentWidth, 96, accent);
      doc.fillColor('#ffffff');
      doc.font('Helvetica-Bold').fontSize(24).text('KitKart', left + 22, 54);
      doc.font('Helvetica').fontSize(11).text('Order receipt and payment record', left + 22, 82);
      doc.font('Helvetica-Bold').fontSize(12).text(`Receipt #${order.id}`, right - 140, 56, { width: 120, align: 'right' });
      doc.font('Helvetica').fontSize(10).text(new Date(order.created_at || Date.now()).toLocaleString(), right - 160, 80, { width: 140, align: 'right' });
    }

    function drawInfoGrid() {
      const top = 150;
      const boxWidth = (contentWidth - 12) / 2;
      const rowHeight = 72;

      drawRoundedBox(left, top, boxWidth, rowHeight, panel, line);
      drawRoundedBox(left + boxWidth + 12, top, boxWidth, rowHeight, panel, line);

      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Customer', left + 16, top + 14);
      doc.text('Payment', left + boxWidth + 28, top + 14);

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(13);
      doc.text(`${order.first_name} ${order.last_name}`, left + 16, top + 30, { width: boxWidth - 32 });
      doc.text(order.payment_method, left + boxWidth + 28, top + 30, { width: boxWidth - 32 });

      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text(order.email, left + 16, top + 50, { width: boxWidth - 32 });
    }

    function drawTableHeader(y) {
      doc.save();
      doc.roundedRect(left, y, contentWidth, 24, 6).fill('#e2e8f0');
      doc.restore();
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(10);
      doc.text('Item', left + 10, y + 7, { width: 210 });
      doc.text('Status', left + 220, y + 7, { width: 90, align: 'center' });
      doc.text('Qty', left + 310, y + 7, { width: 40, align: 'center' });
      doc.text('Amount', right - 110, y + 7, { width: 100, align: 'right' });
      return y + 24;
    }

    function drawItemRow(y, item) {
      const rowHeight = 34;
      doc.save();
      doc.roundedRect(left, y, contentWidth, rowHeight, 6).fill('#ffffff').stroke(line);
      doc.restore();
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(10);
      doc.text(item.product_name, left + 10, y + 8, { width: 210 });
      doc.fillColor(accent).font('Helvetica').fontSize(9);
      doc.text(item.status, left + 220, y + 8, { width: 90, align: 'center' });
      doc.fillColor(ink).text(String(item.quantity), left + 310, y + 8, { width: 40, align: 'center' });
      doc.text(formatCurrency(item.subtotal), right - 110, y + 8, { width: 100, align: 'right' });
      return y + rowHeight + 8;
    }

    function drawSummary(y) {
      const summaryHeight = 86;
      drawRoundedBox(left + contentWidth - 220, y, 220, summaryHeight, '#eff6ff', line);
      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Order total', left + contentWidth - 202, y + 14);
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(18);
      doc.text(formatCurrency(order.total), left + contentWidth - 202, y + 30, { width: 180, align: 'left' });
      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Thank you for shopping with KitKart.', left, y + 28, { width: contentWidth - 240 });
    }

    drawHeader();
    drawInfoGrid();

    let y = 242;
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(13).text('Order Items', left, y);
    y += 18;
    y = drawTableHeader(y);

    order.items.forEach((item) => {
      y = drawItemRow(y, item);
    });

    drawSummary(Math.max(y + 8, 392));

    doc.end();
  });
}

module.exports = {
  generateReceiptPdf,
};
