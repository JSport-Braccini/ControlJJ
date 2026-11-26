import QRCode from 'qrcode';
import { DigitalTicket, SystemConfig, Tournament } from '../types/championship';
import defaultLogoAsset from '../assets/images/jj_corp_shield_logo_1793909841397.jpg';

interface RenderTicketImageInput {
  ticket: DigitalTicket;
  tournament: Tournament;
  systemConfig: SystemConfig;
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function drawVectorShieldFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.fillStyle = '#0A192F';
  drawRoundedRect(ctx, x, y, size, size, 8);
  ctx.fill();

  ctx.fillStyle = '#DC2626';
  ctx.fillRect(x + 6, y + size * 0.62, size - 12, 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${Math.round(size * 0.42)}px "Plus Jakarta Sans", Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JJ', x + size / 2, y + size * 0.42);
  ctx.restore();
}

/**
 * Renderiza el mismo modelo completo de DigitalTicketCard en una imagen PNG de alta resolución
 * para que "Guardar Imagen" y "Copiar Imagen QR" coincidan exactamente con "Imprimir / PDF".
 */
export async function renderDigitalTicketImage({
  ticket,
  tournament,
  systemConfig,
}: RenderTicketImageInput): Promise<{ dataUrl: string; blob: Blob }> {
  const width = 420;
  const scale = 2; // 840px de ancho real para máxima nitidez
  const padX = 18;
  const innerWidth = width - padX * 2;

  // Precalcular textos con Canvas temporal de medición
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  mCtx.font = '800 17px "Plus Jakarta Sans", Inter, sans-serif';
  const titleLines = wrapTextLines(mCtx, tournament.name, width - 40);

  mCtx.font = '500 12px Inter, sans-serif';
  const subtitleText = `${tournament.edition} · ${tournament.venue}`;
  const subtitleLines = wrapTextLines(mCtx, subtitleText, width - 36);

  mCtx.font = '700 13px Inter, sans-serif';
  const buyerLines = wrapTextLines(mCtx, ticket.buyerName, innerWidth - 130);
  const eventDayLines = wrapTextLines(mCtx, ticket.eventDayLabel, innerWidth - 130);

  const hasItems = Boolean(ticket.items && ticket.items.length > 0);
  const itemsCount = hasItems ? ticket.items!.length : 0;

  // Calcular alturas exactas por bloque
  const headerHeight =
    20 + // top padding
    52 + // logo box
    10 +
    15 + // "BOLETO OFICIAL DE ACCESO"
    6 +
    titleLines.length * 21 +
    4 +
    subtitleLines.length * 16 +
    16; // bottom padding

  const bannerHeight = 36;
  const qrBoxHeight = 256;

  // Calcular altura de bloque de detalles
  const rowBuyerHeight = Math.max(32, buyerLines.length * 16 + 14);
  const rowDniHeight = ticket.buyerDni ? 32 : 0;
  const rowDayHeight = Math.max(32, eventDayLines.length * 16 + 14);
  const rowItemsHeight = hasItems
    ? 26 + itemsCount * 22 + 12
    : 34;
  const rowTotalHeight = 36;
  const rowMethodHeight = 32;
  const assistedHeight = ticket.assisted ? 38 : 0;

  const detailsBoxHeight =
    10 +
    rowBuyerHeight +
    rowDniHeight +
    rowDayHeight +
    rowItemsHeight +
    rowTotalHeight +
    rowMethodHeight +
    (assistedHeight ? assistedHeight + 8 : 0) +
    10;

  const totalHeight =
    headerHeight +
    bannerHeight +
    16 +
    qrBoxHeight +
    14 +
    detailsBoxHeight +
    20;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo para generar el boleto.');
  }
  ctx.scale(scale, scale);

  // Fondo blanco base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Cargar QR y Logo en paralelo
  const qrPromise = QRCode.toDataURL(ticket.qrCode, {
    width: 400,
    margin: 1,
    color: {
      dark: '#0A192F',
      light: '#FFFFFF',
    },
  });

  const preferredLogo =
    systemConfig.logoUrl && systemConfig.logoUrl.trim()
      ? systemConfig.logoUrl.trim()
      : defaultLogoAsset || '/images/logo.jpg';

  const [qrUrl, loadedLogo] = await Promise.all([
    qrPromise,
    loadImageSafe(preferredLogo).then((img) => img || loadImageSafe(defaultLogoAsset)),
  ]);
  const qrImg = await loadImageSafe(qrUrl);

  // 1. HEADER CORPORATIVO (#0A192F + borde rojo inferior)
  let curY = 0;
  ctx.fillStyle = '#0A192F';
  ctx.fillRect(0, curY, width, headerHeight);

  // Caja blanca del logo
  const logoSize = 52;
  const logoX = (width - logoSize) / 2;
  const logoY = 18;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 12);
  ctx.fill();

  if (loadedLogo) {
    ctx.save();
    drawRoundedRect(ctx, logoX + 2, logoY + 2, logoSize - 4, logoSize - 4, 10);
    ctx.clip();
    ctx.drawImage(loadedLogo, logoX + 2, logoY + 2, logoSize - 4, logoSize - 4);
    ctx.restore();
  } else {
    drawVectorShieldFallback(ctx, logoX + 2, logoY + 2, logoSize - 4);
  }

  let textY = logoY + logoSize + 18;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#F87171';
  ctx.font = '700 10.5px "JetBrains Mono", monospace';
  ctx.fillText('BOLETO OFICIAL DE ACCESO', width / 2, textY);

  textY += 18;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 17px "Plus Jakarta Sans", Inter, sans-serif';
  for (const line of titleLines) {
    ctx.fillText(line, width / 2, textY);
    textY += 21;
  }

  textY -= 2;
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 12px Inter, sans-serif';
  for (const line of subtitleLines) {
    ctx.fillText(line, width / 2, textY);
    textY += 16;
  }

  // Borde rojo corporativo inferior
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(0, headerHeight - 3, width, 3);

  curY = headerHeight;

  // 2. BANNER DE ESTADO DE PAGO
  const isPaid = ticket.paymentStatus === 'PAID';
  ctx.fillStyle = isPaid ? '#059669' : '#F59E0B';
  ctx.fillRect(0, curY, width, bannerHeight);

  ctx.fillStyle = isPaid ? '#FFFFFF' : '#020617';
  ctx.font = '800 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    isPaid
      ? '✓ ENTRADA PAGADA · INGRESO HABILITADO'
      : '⚠ SEPARADA · PENDIENTE DE PAGO EN PUERTA',
    width / 2,
    curY + bannerHeight / 2
  );

  curY += bannerHeight + 16;

  // 3. SECCIÓN CENTRAL DEL CÓDIGO QR
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, padX, curY, innerWidth, qrBoxHeight, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  const qrSize = 192;
  const qrBoxX = (width - qrSize - 12) / 2;
  const qrBoxY = curY + 14;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrSize + 12, qrSize + 12, 10);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  if (qrImg) {
    ctx.drawImage(qrImg, qrBoxX + 6, qrBoxY + 6, qrSize, qrSize);
  }

  // Badge de código QR debajo de la imagen QR
  const codePillW = Math.min(innerWidth - 40, Math.max(190, mCtx.measureText(ticket.qrCode).width + 64));
  const codePillH = 28;
  const codePillX = (width - codePillW) / 2;
  const codePillY = qrBoxY + qrSize + 20;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, codePillX, codePillY, codePillW, codePillH, 8);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  ctx.fillStyle = '#0A192F';
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ticket.qrCode, width / 2, codePillY + codePillH / 2);

  curY += qrBoxHeight + 14;

  // 4. BLOQUE DE DETALLES DEL COMPRADOR Y EVENTO
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, padX, curY, innerWidth, detailsBoxHeight, 14);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  let rowY = curY + 10;
  const leftX = padX + 14;
  const rightX = padX + innerWidth - 14;

  const drawDivider = (y: number) => {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(rightX, y);
    ctx.stroke();
  };

  // Fila: Comprador
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillText('Comprador:', leftX, rowY + rowBuyerHeight / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 12.5px Inter, sans-serif';
  const buyerStartY = rowY + (rowBuyerHeight - (buyerLines.length - 1) * 16) / 2;
  buyerLines.forEach((line, i) => {
    ctx.fillText(line, rightX, buyerStartY + i * 16);
  });
  rowY += rowBuyerHeight;
  drawDivider(rowY);

  // Fila: DNI (si existe)
  if (ticket.buyerDni) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('DNI / Doc:', leftX, rowY + rowDniHeight / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 12.5px "JetBrains Mono", monospace';
    ctx.fillText(ticket.buyerDni, rightX, rowY + rowDniHeight / 2);
    rowY += rowDniHeight;
    drawDivider(rowY);
  }

  // Fila: Fecha / Día
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillText('Fecha / Día:', leftX, rowY + rowDayHeight / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F172A';
  ctx.font = '600 12px Inter, sans-serif';
  const dayStartY = rowY + (rowDayHeight - (eventDayLines.length - 1) * 16) / 2;
  eventDayLines.forEach((line, i) => {
    ctx.fillText(line, rightX, dayStartY + i * 16);
  });
  rowY += rowDayHeight;
  drawDivider(rowY);

  // Fila: Desglose o Entrada única
  if (hasItems) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText(`Desglose (${ticket.quantity} entradas):`, leftX, rowY + 14);

    const subBoxY = rowY + 26;
    const subBoxH = itemsCount * 22 + 6;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, leftX, subBoxY, innerWidth - 28, subBoxH, 8);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ticket.items!.forEach((it, idx) => {
      const iy = subBoxY + 14 + idx * 22;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1E293B';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(`${it.quantity}x ${it.label}`, leftX + 10, iy);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText(`S/ ${it.subtotal.toFixed(2)}`, rightX - 10, iy);
    });

    rowY += rowItemsHeight;
    drawDivider(rowY);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Entrada:', leftX, rowY + rowItemsHeight / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 12.5px Inter, sans-serif';
    ctx.fillText(`${ticket.quantity}x ${ticket.label}`, rightX, rowY + rowItemsHeight / 2);

    rowY += rowItemsHeight;
    drawDivider(rowY);
  }

  // Fila: Total a Pagar / Pagado
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillText('Total a Pagar / Pagado:', leftX, rowY + rowTotalHeight / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0A192F';
  ctx.font = '800 14.5px "JetBrains Mono", monospace';
  ctx.fillText(`S/ ${ticket.totalAmount.toFixed(2)}`, rightX, rowY + rowTotalHeight / 2);

  rowY += rowTotalHeight;
  drawDivider(rowY);

  // Fila: Método de Pago
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px Inter, sans-serif';
  ctx.fillText('Método de Pago:', leftX, rowY + rowMethodHeight / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.font = '600 12px Inter, sans-serif';
  const methodLabel =
    ticket.paymentMethod === 'EFECTIVO_PUERTA'
      ? 'Efectivo en Puerta'
      : ticket.paymentMethod === 'TRANSFER'
      ? 'Transferencia'
      : ticket.paymentMethod;
  ctx.fillText(methodLabel, rightX, rowY + rowMethodHeight / 2);
  rowY += rowMethodHeight;

  // Fila opcional: Asistido / Ingreso Registrado
  if (ticket.assisted) {
    rowY += 6;
    ctx.fillStyle = '#ECFDF5';
    drawRoundedRect(ctx, leftX, rowY, innerWidth - 28, 30, 8);
    ctx.fill();
    ctx.strokeStyle = '#A7F3D0';
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    ctx.font = '700 11.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `✓ Ingreso Registrado a las ${ticket.checkInTime || ''}`,
      width / 2,
      rowY + 15
    );
  }

  // Borde exterior de la tarjeta (mismo estilo border-2 border-slate-300)
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, totalHeight - 2);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('No se pudo exportar la imagen PNG del boleto.'));
    }, 'image/png');
  });

  return { dataUrl, blob };
}
