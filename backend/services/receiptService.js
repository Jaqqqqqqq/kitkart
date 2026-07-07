const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`;
}

function generateReceiptPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('KitKart Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order #: ${order.id}`);
    doc.text(`Customer: ${order.first_name} ${order.last_name}`);
    doc.text(`Email: ${order.email}`);
    doc.text(`Payment: ${order.payment_method}`);
    doc.text(`Date: ${new Date(order.created_at || Date.now()).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Order Details');
    doc.moveDown(0.5);

    order.items.forEach((item) => {
      doc.fontSize(11).text(`${item.product_name}`);
      doc.text(`Status: ${item.status}`);
      doc.text(`Qty: ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}`);
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: ${formatCurrency(order.total)}`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(10).text('Thank you for shopping with KitKart.', { align: 'center' });

    doc.end();
  });
}

module.exports = {
  generateReceiptPdf,
};
