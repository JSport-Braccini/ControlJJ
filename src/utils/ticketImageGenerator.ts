import { DigitalTicket, Tournament } from '../types/championship';

/**
 * Generates a high-resolution canvas with the official digital ticket pass
 * containing tournament branding, status, QR image, buyer data, and breakdown.
 */
export async function generateTicketCardCanvas(
  ticket: DigitalTicket,
  tournament: Tournament,
  qrDataUrl: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 920;
  const ctx = canvas.getContext('2d')!;

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top Header Banner (#0A192F)
  ctx.fillStyle = '#0A192F';
  ctx.fillRect(0, 0, canvas.width, 150);

  // Red accent border
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, 146, canvas.width, 4);

  // Header Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F87171';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('PASE OFICIAL DE ACCESO', canvas.width / 2, 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(tournament.name || 'Torneo JJ CopaControl', canvas.width / 2, 75);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px sans-serif';
  ctx.fillText(
    `${tournament.edition || 'Edición Oficial'} · ${tournament.venue || 'Complejo Deportivo'}`,
    canvas.width / 2,
    108
  );

  // 3. Payment Status Banner
  const isPaid = ticket.paymentStatus === 'PAID';
  ctx.fillStyle = isPaid ? '#059669' : '#D97706';
  ctx.fillRect(0, 150, canvas.width, 38);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(
    isPaid ? '✓ ENTRADA PAGADA · INGRESO HABILITADO' : '⚠️ SEPARADO · PENDIENTE DE PAGO EN PUERTA',
    canvas.width / 2,
    174
  );

  // 4. Draw QR Code Image
  if (qrDataUrl) {
    try {
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve(); // continue even if fails
        qrImg.src = qrDataUrl;
      });
      const qrSize = 250;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 205;

      // Subtle shadow & border for QR
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      // ignore
    }
  }

  // 5. Code Badge
  const badgeWidth = 320;
  const badgeX = (canvas.width - badgeWidth) / 2;
  const badgeY = 475;
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(badgeX, badgeY, badgeWidth, 38);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(badgeX, badgeY, badgeWidth, 38);
  ctx.fillStyle = '#0A192F';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(ticket.qrCode, canvas.width / 2, badgeY + 25);

  // 6. Ticket Information Box
  const boxX = 35;
  const boxY = 530;
  const boxW = canvas.width - 70;
  const boxH = 295;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.textAlign = 'left';
  let curY = boxY + 35;

  // Row 1: Comprador
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Comprador:', boxX + 25, curY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(ticket.buyerName, boxX + 160, curY);

  // Row 2: Fecha / Jornada
  curY += 35;
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Fecha / Jornada:', boxX + 25, curY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(ticket.eventDayLabel || 'Jornada Oficial', boxX + 160, curY);

  // Row 3: Desglose de Entradas
  curY += 35;
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Entradas:', boxX + 25, curY);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px sans-serif';

  if (ticket.items && ticket.items.length > 0) {
    ticket.items.forEach((it) => {
      ctx.fillText(`• ${it.quantity}x ${it.label} (S/ ${it.subtotal.toFixed(2)})`, boxX + 160, curY);
      curY += 24;
    });
  } else {
    ctx.fillText(`${ticket.quantity}x ${ticket.label}`, boxX + 160, curY);
    curY += 26;
  }

  // Row 4: Total a Pagar
  curY += 10;
  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Total:', boxX + 25, curY);
  ctx.fillStyle = '#0A192F';
  ctx.font = 'bold 20px monospace';
  const payLabel = ticket.paymentMethod === 'EFECTIVO_PUERTA' ? 'Efectivo en Puerta' : ticket.paymentMethod;
  ctx.fillText(`S/ ${ticket.totalAmount.toFixed(2)} (${payLabel})`, boxX + 160, curY);

  // 7. Footer Instructions
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    'Muestra este código QR oficial al ingresar al partido para control en puerta.',
    canvas.width / 2,
    870
  );

  return canvas;
}

/**
 * Converts canvas to PNG Blob
 */
export async function generateTicketCardImageBlob(
  ticket: DigitalTicket,
  tournament: Tournament,
  qrDataUrl: string
): Promise<Blob> {
  const canvas = await generateTicketCardCanvas(ticket, tournament, qrDataUrl);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

/**
 * Copies the QR pass image directly to the system clipboard (PNG).
 * On PC, the operator or buyer can then press Ctrl+V directly into WhatsApp Web!
 */
export async function copyTicketImageToClipboard(
  ticket: DigitalTicket,
  tournament: Tournament,
  qrDataUrl: string
): Promise<boolean> {
  try {
    const blob = await generateTicketCardImageBlob(ticket, tournament, qrDataUrl);
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
  return false;
}

/**
 * Triggers a download of the digital pass image as PNG
 */
export async function downloadTicketImage(
  ticket: DigitalTicket,
  tournament: Tournament,
  qrDataUrl: string
): Promise<void> {
  const blob = await generateTicketCardImageBlob(ticket, tournament, qrDataUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Boleto_QR_${ticket.qrCode}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
