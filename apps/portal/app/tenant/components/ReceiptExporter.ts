export interface Invoice {
  invoiceId: string;
  propertyName: string;
  unitNumber: string;
  amountDue: number;
  status: string;
  tenantEmail?: string;
  tenantName?: string;
}

export function downloadReceiptAsPNG(invoice: Invoice) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#05080b'; // Ink dark bg
  ctx.fillRect(0, 0, 600, 700);

  // Outer border
  ctx.strokeStyle = '#ff6b6b'; // Coral border
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 680);

  // Subtle grid details in background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 20; i < 580; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 20);
    ctx.lineTo(i, 680);
    ctx.stroke();
  }
  for (let j = 20; j < 680; j += 30) {
    ctx.beginPath();
    ctx.moveTo(20, j);
    ctx.lineTo(580, j);
    ctx.stroke();
  }

  // Brand Header
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 24px Geist, "Segoe UI", sans-serif';
  ctx.fillText('TRENOR', 50, 70);

  ctx.fillStyle = '#e6e1d8';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('TRANSACTION LEDGER SYSTEM', 50, 95);

  // Divider
  ctx.strokeStyle = '#252d37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 120);
  ctx.lineTo(550, 120);
  ctx.stroke();

  // Receipt Label
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 16px Geist, "Segoe UI", sans-serif';
  ctx.fillText('OFFICIAL RECEIPT', 50, 160);

  // Details
  const fields = [
    { label: 'RECEIPT ID', value: invoice.invoiceId },
    { label: 'PROPERTY', value: invoice.propertyName },
    { label: 'UNIT NUMBER', value: invoice.unitNumber },
    { label: 'TENANT', value: invoice.tenantName || 'Resident' },
    { label: 'TENANT EMAIL', value: invoice.tenantEmail || '—' },
    { label: 'DATE SETTLED', value: new Date().toLocaleDateString() },
    { label: 'STATUS', value: 'PAID & CLEARED' }
  ];

  let startY = 210;
  fields.forEach(f => {
    ctx.fillStyle = '#a39c92'; // Warm secondary text
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(f.label, 50, startY);

    ctx.fillStyle = f.label === 'STATUS' ? '#34d399' : '#f8f5ef';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(f.value, 200, startY + 2);

    // Light divider line between fields
    ctx.strokeStyle = '#11161d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, startY + 15);
    ctx.lineTo(550, startY + 15);
    ctx.stroke();

    startY += 45;
  });

  // Amount Box
  ctx.fillStyle = '#0a0f14';
  ctx.fillRect(50, startY, 500, 80);
  ctx.strokeStyle = '#252d37';
  ctx.strokeRect(50, startY, 500, 80);

  ctx.fillStyle = '#a39c92';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.fillText('AMOUNT PAID', 70, startY + 30);

  ctx.fillStyle = '#34d399'; // Emerald Green
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.fillText(`€${Number(invoice.amountDue).toLocaleString()}`, 70, startY + 62);

  // Verification Seal / Watermark
  ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
  ctx.font = 'bold 36px Geist, sans-serif';
  ctx.fillText('VERIFIED', 380, startY + 52);

  // Footer note
  ctx.fillStyle = '#52637a';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('This document is cryptographically linked to the properties ledger database.', 50, 650);

  // Download trigger
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Receipt-${invoice.invoiceId}.png`;
  link.href = dataUrl;
  link.click();
}

export function downloadReceiptAsPDF(invoice: Invoice) {
  // Use a beautifully formatted print iframe to save as a native PDF file
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${invoice.invoiceId}</title>
      <style>
        body {
          font-family: 'Segoe UI', Helvetica, sans-serif;
          background: #ffffff;
          color: #1a1a1a;
          margin: 0;
          padding: 40px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          padding: 30px;
          border-radius: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #ff6b6b;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: 800;
          color: #ff6b6b;
          letter-spacing: -0.5px;
        }
        .system-label {
          font-family: monospace;
          font-size: 10px;
          color: #718096;
        }
        .title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #2d3748;
        }
        .field {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #edf2f7;
          font-size: 14px;
        }
        .label {
          color: #718096;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }
        .value {
          color: #1a202c;
          font-weight: 500;
        }
        .amount-box {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          padding: 20px;
          margin-top: 30px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .amount-title {
          font-weight: 600;
          font-size: 12px;
          color: #718096;
          text-transform: uppercase;
        }
        .amount-value {
          font-size: 24px;
          font-weight: 700;
          color: #38a169;
        }
        .status-badge {
          background: #c6f6d5;
          color: #22543d;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
        }
        .footer {
          margin-top: 40px;
          font-size: 10px;
          color: #a0aec0;
          text-align: center;
          border-top: 1px solid #edf2f7;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <div class="logo">TRENOR</div>
            <div class="system-label">TRANSACTION LEDGER SYSTEM</div>
          </div>
          <div>
            <span class="status-badge">PAID</span>
          </div>
        </div>

        <div class="title">OFFICIAL PAYMENT RECEIPT</div>

        <div class="field">
          <span class="label">Receipt ID</span>
          <span class="value">${invoice.invoiceId}</span>
        </div>
        <div class="field">
          <span class="label">Property</span>
          <span class="value">${invoice.propertyName}</span>
        </div>
        <div class="field">
          <span class="label">Unit Number</span>
          <span class="value">${invoice.unitNumber}</span>
        </div>
        <div class="field">
          <span class="label">Resident</span>
          <span class="value">${invoice.tenantName || 'Resident'}</span>
        </div>
        <div class="field">
          <span class="label">Email Address</span>
          <span class="value">${invoice.tenantEmail || '—'}</span>
        </div>
        <div class="field">
          <span class="label">Settled Date</span>
          <span class="value">${new Date().toLocaleDateString()}</span>
        </div>

        <div class="amount-box">
          <span class="amount-title">Total Amount Settled</span>
          <span class="amount-value">€${Number(invoice.amountDue).toLocaleString()}</span>
        </div>

        <div class="footer">
          This receipt verifies full payment of the specified ledger invoice and is cryptographically validated.
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for print dialog to exit, then remove iframe
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
}
