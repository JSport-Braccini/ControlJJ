import { jsPDF } from 'jspdf';
import {
  DigitalTicket,
  Tournament,
  SystemConfig,
  Player,
  BeverageProduct,
  ExpenseItem,
  SpectatorEntry,
} from '../types/championship';
import { renderDigitalTicketImage } from './ticketImageRenderer';

/**
 * Intenta abrir el diálogo nativo de impresión sin bloquear ni arrojar errores en iframes,
 * y genera/descarga simultáneamente un PDF listo para imprimir en móvil o PC.
 */
function measureImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 820,
        height: img.naturalHeight || 1240,
      });
    };
    img.onerror = () => resolve({ width: 820, height: 1240 });
    img.src = dataUrl;
  });
}

export async function printOrDownloadTicketPdf(
  ticket: DigitalTicket,
  tournament: Tournament,
  systemConfig: SystemConfig
): Promise<void> {
  const { dataUrl } = await renderDigitalTicketImage({
    ticket,
    tournament,
    systemConfig,
  });
  const { width, height } = await measureImageDimensions(dataUrl);

  // Crear PDF en formato vertical ajustado al boleto oficial
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxW = pageWidth - 36;
  const maxH = pageHeight - 36;
  const ratio = Math.min(maxW / width, maxH / height);
  const drawW = width * ratio;
  const drawH = height * ratio;
  const x = (pageWidth - drawW) / 2;
  const y = 18;

  pdf.addImage(dataUrl, 'PNG', x, y, drawW, drawH);
  pdf.save(`Boleto-${ticket.qrCode}.pdf`);

  try {
    window.print();
  } catch {
    // Silencioso en iframes que bloquean window.print()
  }
}

export interface GeneralReportPdfInput {
  tournament: Tournament;
  players: Player[];
  spectatorEntries: SpectatorEntry[];
  beverages: BeverageProduct[];
  expenses: ExpenseItem[];
  digitalTickets: DigitalTicket[];
}

export function printOrDownloadGeneralReportPdf(input: GeneralReportPdfInput): void {
  const {
    tournament,
    players,
    spectatorEntries,
    beverages,
    expenses,
    digitalTickets,
  } = input;

  const totalTicketRevenue = spectatorEntries.reduce((acc, e) => acc + e.totalAmount, 0);
  const totalBeverageRevenue = beverages.reduce((acc, b) => acc + b.soldCount * b.price, 0);
  const grossRevenue = totalTicketRevenue + totalBeverageRevenue;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netResult = grossRevenue - totalExpenses;

  const totalSpectators = spectatorEntries.reduce((acc, e) => acc + e.quantity, 0);
  const totalAdultSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'ADULTO')
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalChildSpectators = spectatorEntries
    .filter((e) => e.isChild)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalVipSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'VIP')
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalFreeSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'GRATIS' || e.price === 0)
    .reduce((acc, e) => acc + e.quantity, 0);

  const totalBeverageUnits = beverages.reduce((acc, b) => acc + b.soldCount, 0);
  const totalPlayers = players.length;
  const checkedInPlayers = players.filter((p) => p.checkedIn).length;
  const attendanceRate = totalPlayers > 0 ? Math.round((checkedInPlayers / totalPlayers) * 100) : 0;

  const webPaidTotal = digitalTickets
    .filter((t) => t.channel === 'WEB' && t.paymentStatus === 'PAID' && !t.paidAtDoor)
    .reduce((acc, t) => acc + t.totalAmount, 0);
  const webReservedTotal = digitalTickets
    .filter((t) => t.channel === 'WEB' && t.paymentStatus === 'RESERVED_UNPAID')
    .reduce((acc, t) => acc + t.totalAmount, 0);
  const doorPaidTotal = digitalTickets
    .filter((t) => t.paidAtDoor || t.channel === 'VENUE')
    .reduce((acc, t) => acc + t.totalAmount, 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 16;

  const ensureSpace = (needed = 12) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // Header Corporativo Azul Marino
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 28.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REPORTE Y RESULTADO GENERAL DEL CAMPEONATO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${tournament.name} (${tournament.edition}) · ${tournament.venue}`, 14, 19);
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha del evento: ${tournament.date}   |   Generado: ${new Date().toLocaleString('es-PE')}`, 14, 24.5);

  y = 40;

  // Bloque 1: Resultado Neto
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. BALANCE FINANCIERO CONSOLIDADO', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Ingresos por Entradas: S/ ${totalTicketRevenue.toFixed(2)}`, 18, y + 14);
  doc.text(`Ingresos por Bebidas: S/ ${totalBeverageRevenue.toFixed(2)}`, 82, y + 14);
  doc.text(`Gastos Operativos: - S/ ${totalExpenses.toFixed(2)}`, 144, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  if (netResult >= 0) {
    doc.setTextColor(4, 120, 87);
  } else {
    doc.setTextColor(185, 28, 28);
  }
  doc.text(`UTILIDAD NETA FINAL: S/ ${netResult.toFixed(2)}`, 18, y + 23);

  y += 36;

  // Bloque 2: Taquilla y Espectadores
  ensureSpace(34);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. CONTROL DE TAQUILLA Y ESPECTADORES', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`• Total Espectadores Ingresados: ${totalSpectators} personas (Recaudado: S/ ${totalTicketRevenue.toFixed(2)})`, 16, y);
  y += 5.5;
  doc.text(`• General Adultos: ${totalAdultSpectators}   |   Niños / Menores: ${totalChildSpectators}   |   Tribuna VIP: ${totalVipSpectators}   |   Cortesías: ${totalFreeSpectators}`, 16, y);
  y += 5.5;
  doc.text(`• Web Pagadas: S/ ${webPaidTotal.toFixed(2)}   |   Separadas por Cobrar: S/ ${webReservedTotal.toFixed(2)}   |   Cobradas en Puerta: S/ ${doorPaidTotal.toFixed(2)}`, 16, y);
  y += 10;

  // Bloque 3: Venta de Bebidas
  ensureSpace(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`3. VENTA DE BEBIDAS (${totalBeverageUnits} unidades · S/ ${totalBeverageRevenue.toFixed(2)})`, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  beverages.forEach((b) => {
    ensureSpace(6);
    doc.text(
      `• ${b.name} (${b.presentation}): ${b.soldCount} vendidas x S/ ${b.price.toFixed(2)} = S/ ${(b.soldCount * b.price).toFixed(2)} (Stock: ${b.stock})`,
      16,
      y
    );
    y += 5.2;
  });
  y += 5;

  // Bloque 4: Gastos Generales
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`4. GASTOS GENERALES (${expenses.length} registros · S/ ${totalExpenses.toFixed(2)})`, 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (expenses.length === 0) {
    doc.text('• Sin gastos registrados en este torneo.', 16, y);
    y += 6;
  } else {
    expenses.forEach((exp) => {
      ensureSpace(6);
      doc.text(`• [${exp.date}] ${exp.category} - ${exp.concept}: S/ ${exp.amount.toFixed(2)}`, 16, y);
      y += 5.2;
    });
  }
  y += 5;

  // Bloque 5: Asistencia de Jugadores
  ensureSpace(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. ASISTENCIA DE JUGADORES', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `• Jugadores Presentes: ${checkedInPlayers} de ${totalPlayers} (${attendanceRate}%)   |   Intentos Duplicados Bloqueados: ${players.reduce((a, p) => a + p.duplicateAttempts, 0)}`,
    16,
    y
  );

  const safeName = tournament.name.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`Reporte_General_${safeName}_${tournament.date}.pdf`);

  try {
    window.print();
  } catch {
    // Silencioso en iframes que bloquean window.print()
  }
}
