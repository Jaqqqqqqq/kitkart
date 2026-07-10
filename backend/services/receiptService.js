const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value || Date.now()).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function generateReceiptPdf({ orderId, createdAt, customerName, email, paymentMethod, item, status }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      bufferPages: true,
      info: {
        Title: `KitKart Receipt #${orderId}`,
        Author: 'KitKart',
        Subject: 'Order receipt',
      },
    });

    const chunks = [];
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const bottom = pageHeight - doc.page.margins.bottom;
    const contentWidth = right - left;
    const accent = '#0f766e';
    const accentDark = '#115e59';
    const warm = '#f97316';
    const ink = '#0f172a';
    const softInk = '#475569';
    const line = '#cbd5e1';
    const panel = '#f8fafc';
    const safeItem = item || {};

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

    function statusColors(value) {
      const normalized = String(value || '').toLowerCase();

      if (normalized === 'cancelled') {
        return { bg: '#fee2e2', text: '#b91c1c' };
      }

      if (normalized === 'delivered') {
        return { bg: '#dcfce7', text: '#15803d' };
      }

      if (normalized === 'shipped') {
        return { bg: '#e0f2fe', text: '#0369a1' };
      }

      return { bg: '#fef3c7', text: '#b45309' };
    }

    function drawHeader() {
      drawRoundedBox(left, 36, contentWidth, 104, accent);
      doc.save();
      doc.rect(left + contentWidth - 160, 36, 160, 104).fill(accentDark);
      doc.restore();
      doc.fillColor('#ffffff');
      doc.font('Helvetica-Bold').fontSize(25).text('KitKart', left + 22, 54);
      doc.font('Helvetica').fontSize(11).text('Official order receipt', left + 22, 84);
      doc.fillColor('#ccfbf1').fontSize(9).text('School supplies made simple', left + 22, 104);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(`Receipt #${orderId}`, right - 140, 56, { width: 120, align: 'right' });
      doc.font('Helvetica').fontSize(10).text(formatDate(createdAt), right - 160, 82, { width: 140, align: 'right' });
    }

    function drawInfoGrid() {
      const top = 158;
      const boxWidth = (contentWidth - 12) / 2;
      const rowHeight = 84;

      drawRoundedBox(left, top, boxWidth, rowHeight, panel, line);
      drawRoundedBox(left + boxWidth + 12, top, boxWidth, rowHeight, panel, line);

      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Customer', left + 16, top + 14);
      doc.text('Payment', left + boxWidth + 28, top + 14);

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(13);
      doc.text(customerName, left + 16, top + 30, { width: boxWidth - 32 });
      doc.text(paymentMethod, left + boxWidth + 28, top + 30, { width: boxWidth - 32 });

      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text(email, left + 16, top + 52, { width: boxWidth - 32 });
      doc.text('1 updated item in this receipt', left + boxWidth + 28, top + 52, { width: boxWidth - 32 });
    }

    function drawTableHeader(y) {
      doc.save();
      doc.roundedRect(left, y, contentWidth, 28, 6).fill('#e2e8f0');
      doc.restore();
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(10);
      doc.text('Item', left + 12, y + 9, { width: 210 });
      doc.text('Status', left + 236, y + 9, { width: 96, align: 'center' });
      doc.text('Qty', left + 350, y + 9, { width: 40, align: 'center' });
      doc.text('Amount', right - 112, y + 9, { width: 100, align: 'right' });
      return y + 28;
    }

    function drawItemRow(y, currentItem, index) {
      const rowHeight = 42;
      const colors = statusColors(currentItem.status);
      const rowFill = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      doc.save();
      doc.roundedRect(left, y, contentWidth, rowHeight, 6).fill(rowFill).stroke(line);
      doc.roundedRect(left + 236, y + 10, 96, 20, 10).fill(colors.bg);
      doc.restore();

      doc.fillColor(ink).font('Helvetica-Bold').fontSize(10);
      doc.text(currentItem.product_name, left + 12, y + 10, { width: 210 });
      doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(8);
      doc.text(String(currentItem.status || 'Pending'), left + 242, y + 16, { width: 84, align: 'center' });
      doc.fillColor(ink).font('Helvetica').fontSize(10);
      doc.text(String(currentItem.quantity), left + 350, y + 12, { width: 40, align: 'center' });
      doc.font('Helvetica-Bold').text(formatCurrency(currentItem.subtotal), right - 112, y + 12, { width: 100, align: 'right' });
      return y + rowHeight + 8;
    }

    function drawSummary(y) {
      const summaryHeight = 94;
      drawRoundedBox(left + contentWidth - 220, y, 220, summaryHeight, '#eff6ff', line);
      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Order total', left + contentWidth - 202, y + 14);
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(18);
      doc.text(formatCurrency(safeItem.subtotal), left + contentWidth - 202, y + 30, { width: 180, align: 'left' });
      doc.fillColor(warm).font('Helvetica-Bold').fontSize(9);
      doc.text('1 updated item purchased', left + contentWidth - 202, y + 58, { width: 180 });
      doc.fillColor(softInk).font('Helvetica').fontSize(9);
      doc.text('Thank you for shopping with KitKart.', left, y + 28, { width: contentWidth - 240 });
    }

    function drawFooter() {
      const range = doc.bufferedPageRange();

      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.moveTo(left, bottom + 8).lineTo(right, bottom + 8).lineWidth(0.5).stroke('#e2e8f0');
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(8);
        doc.text('KitKart receipt generated for customer records.', left, bottom + 16, { width: contentWidth / 2 });
        doc.text(`Page ${i + 1} of ${range.count}`, right - 120, bottom + 16, { width: 120, align: 'right' });
      }
    }

    drawHeader();
    drawInfoGrid();

    let y = 262;
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(13).text('Updated Item', left, y);
    y += 18;
    y = drawTableHeader(y);
    y = drawItemRow(y, {
      product_name: safeItem.product_name,
      status,
      quantity: safeItem.quantity,
      subtotal: safeItem.subtotal,
    }, 0);

    drawSummary(Math.max(y + 8, 420));
    drawFooter();

    doc.end();
  });
}

module.exports = {
  generateReceiptPdf,
};
