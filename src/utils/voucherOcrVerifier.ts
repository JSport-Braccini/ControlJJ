import { createWorker, PSM, Worker } from 'tesseract.js';

export interface VoucherVerificationInput {
  imageBuffer: Buffer;
  expectedAmount: number;
  paymentMethod: string;
  officialHolder: string;
  officialPhone?: string;
  bankName?: string;
  bankAccount?: string;
  bankCci?: string;
}

export interface VoucherVerificationResult {
  success: boolean;
  isValid: boolean;
  isLegitimateVoucher: boolean;
  amountMatches: boolean;
  recipientMatches: boolean;
  detectedAmount: number | null;
  expectedAmount: number;
  detectedRecipientName: string | null;
  detectedRecipientPhone?: string | null;
  detectedOperationNumber?: string | null;
  detectedDate?: string | null;
  officialHolder: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  verificationEngine: 'GEMINI' | 'OCR';
}

// Singleton serialized OCR worker to avoid expensive initialization on every request
let workerPromise: Promise<Worker> | null = null;
let ocrQueue: Promise<unknown> = Promise.resolve();

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('spa').catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function recognizeImageText(
  imageBuffer: Buffer
): Promise<{ primaryText: string; sparseText: string; combinedText: string }> {
  const task = ocrQueue.then(async () => {
    const worker = await getOcrWorker();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const autoRes = await worker.recognize(imageBuffer);
    const primaryText = autoRes?.data?.text || '';

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const sparseRes = await worker.recognize(imageBuffer);
    const sparseText = sparseRes?.data?.text || '';

    const combinedText = [primaryText, sparseText].filter(Boolean).join('\n');
    return { primaryText, sparseText, combinedText };
  });
  ocrQueue = task.catch(() => undefined);
  return task;
}

export function normalizeText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTextPreservingLines(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeWordForOcr(word: string): string {
  return normalizeText(word)
    .replace(/[^A-Z0-9]/g, '');
}

function ocrFoldChars(word: string): string {
  return word
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

const STOP_WORDS = new Set([
  'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'A', 'EN', 'POR', 'PARA',
  'EIRL', 'SAC', 'SRL', 'SA', 'SAA', 'IRL', 'CO', 'LTDA', 'INC',
]);

export function extractHolderCoreTokens(officialHolder: string): string[] {
  const norm = normalizeText(officialHolder)
    .replace(/\bE\.?I\.?R\.?L\.?\b/g, ' ')
    .replace(/\bS\.?A\.?C\.?\b/g, ' ')
    .replace(/\bS\.?R\.?L\.?\b/g, ' ')
    .replace(/\bS\.?A\.?A?\.?\b/g, ' ');

  return norm
    .split(/[^A-Z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export function doesRecipientMatch(
  ocrOrDetectedText: string,
  officialHolder: string
): boolean {
  if (!ocrOrDetectedText || !officialHolder) return false;
  const normText = normalizeText(ocrOrDetectedText);
  const coreTokens = extractHolderCoreTokens(officialHolder);

  if (coreTokens.length === 0) return false;

  // Fast exact normalized substring check for full core phrase
  const joinedCore = coreTokens.join(' ');
  if (normText.includes(joinedCore)) return true;

  const ocrWords = normText
    .split(/[^A-Z0-9]+/)
    .map((w) => normalizeWordForOcr(w))
    .filter((w) => w.length >= 2);

  if (ocrWords.length === 0) return false;

  const tokenMatches = (token: string): boolean => {
    const cleanToken = normalizeWordForOcr(token);
    if (!cleanToken) return false;

    for (const w of ocrWords) {
      if (w === cleanToken) return true;
      if (ocrFoldChars(w) === ocrFoldChars(cleanToken)) return true;

      // Allow minor OCR typo only on longer words
      if (cleanToken.length >= 5 && w.length >= 4) {
        const maxDist = cleanToken.length >= 8 ? 2 : 1;
        if (levenshtein(ocrFoldChars(w), ocrFoldChars(cleanToken)) <= maxDist) {
          return true;
        }
      }

      // Handle Yape/Plin ellipsis truncation like "DEPOR..." if word is prefix >= 5
      if (cleanToken.length >= 6 && w.length >= 5 && cleanToken.startsWith(w)) {
        if (normText.includes(`${w}...`) || normText.includes(`${w}…`)) {
          return true;
        }
      }
    }
    return false;
  };

  let matchedCount = 0;
  for (const token of coreTokens) {
    if (tokenMatches(token)) matchedCount++;
  }

  // Strict matching:
  // - 1..3 core tokens (e.g. "Organización JJ Deportes" or "Juan Perez"): ALL tokens must match!
  // - 4+ core tokens (e.g. "Juan Carlos Perez Gomez"): at least N-1 tokens must match (in case middle name omitted on bank screen)
  const requiredMatches =
    coreTokens.length <= 3 ? coreTokens.length : coreTokens.length - 1;

  return matchedCount >= requiredMatches;
}

function stripNonAmountNumbers(text: string): string {
  return text
    // Remove dates: 13/11/2026, 13-11-26, 13 nov. 2026
    .replace(/\b\d{1,2}[ \t]*[/-][ \t]*\d{1,2}[ \t]*[/-][ \t]*\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}[ \t]+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)[A-Z.]*[ \t]+\d{2,4}\b/g, ' ')
    // Remove times: 12:56, 01:05:33, 01:05 p. m.
    .replace(/\b\d{1,2}[ \t]*:[ \t]*\d{2}(?:[ \t]*:[ \t]*\d{2})?(?:[ \t]*[AP]\.?[ \t]*M\.?)?\b/g, ' ')
    // Remove bank accounts / CCI with hyphens
    .replace(/\b\d{3,4}(?:-\d{2,}){2,}\b/g, ' ')
    // Remove phone numbers / operation IDs (6+ consecutive digits)
    .replace(/\b\d{6,}\b/g, ' ')
    // Remove masked phones like *** *** 321 or *** 321
    .replace(/\*+[ \t]*\*+[ \t]*\d{2,4}/g, ' ')
    .replace(/\*+[ \t]*\d{2,4}/g, ' ');
}

export function extractAmountsFromText(rawText: string): {
  explicitAmounts: number[];
  fallbackLineAmounts: number[];
} {
  const norm = normalizeTextPreservingLines(rawText);
  const cleaned = stripNonAmountNumbers(norm);

  const explicitAmounts: number[] = [];
  const pushValid = (arr: number[], rawNum: string) => {
    const val = parseFloat(rawNum.replace(',', '.'));
    if (Number.isFinite(val) && val > 0 && val < 100000) {
      arr.push(Math.round(val * 100) / 100);
    }
  };

  // 1. Explicit currency symbol: S/ 20.00, S/. 20, SI 20.00 (common OCR of S/), 5/ 20, $/ 20, PEN 20.00, SOLES 20
  const currencyRegex =
    /(?:S[ \t]*[/\\|!.][ \t]*\.?|\bS[I1l|]\.?[ \t]+|5[ \t]*\/|\$[ \t]*\/|\bPEN\b|\bSOLES\b)[ \t]*([0-9]{1,5}(?:[.,][0-9]{1,2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = currencyRegex.exec(cleaned)) !== null) {
    pushValid(explicitAmounts, m[1]);
  }

  // 2. Payment verb/label + amount: MONTO: 20.00, IMPORTE 20, YAPEASTE 20, TOTAL 20.00
  const labelRegex =
    /(?:\bMONTO\b|\bIMPORTE\b|\bTOTAL\b|\bYAPEASTE\b|\bENVIASTE\b|\bPAGASTE\b|\bTRANSFERISTE\b|\bVALOR\b)[ \t]*(?:TRANSFERIDO|PAGADO|ENVIADO|TOTAL|DE)?[ \t]*:?[ \t]*(?:S\/\.?|S[I1l]|PEN)?[ \t]*([0-9]{1,5}(?:[.,][0-9]{1,2})?)/g;
  while ((m = labelRegex.exec(cleaned)) !== null) {
    pushValid(explicitAmounts, m[1]);
  }

  // 3. Explicit decimal amounts like 20.00 or 15.50 (excludes dates/times/accounts already stripped)
  const decimalRegex = /\b([0-9]{1,4}[.,][0-9]{2})\b/g;
  while ((m = decimalRegex.exec(cleaned)) !== null) {
    pushValid(explicitAmounts, m[1]);
  }

  // 4. Standalone integer line right near payment header (handles Yape when OCR drops tiny "S/")
  const fallbackLineAmounts: number[] = [];
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const singleIntMatch = line.match(/^([0-9]{1,4})$/);
    if (singleIntMatch) {
      const nearby = [lines[i - 2], lines[i - 1], lines[i + 1], lines[i + 2]]
        .filter(Boolean)
        .join(' ');
      const hasPaymentContextNearby =
        /(YAPE|PLIN|ENVIASTE|PAGASTE|TRANSFER|MONTO|IMPORTE|EXITOS|CONSTANCIA|TE YAPEO|PLINEO|OPERACION|DESTINO)/.test(
          nearby
        );
      if (hasPaymentContextNearby) {
        pushValid(fallbackLineAmounts, singleIntMatch[1]);
      }
    }
  }

  return { explicitAmounts, fallbackLineAmounts };
}

export function extractRecipientCandidateFromText(rawText: string): string | null {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const labelPatterns = [
    /^(?:PARA|ENVIADO\s+A|DESTINATARIO|TITULAR|BENEFICIARIO|A\s+NOMBRE\s+DE|CUENTA\s+DESTINO|RECIBE)\s*:?\s*(.+)$/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of labelPatterns) {
      const m = line.match(pat);
      if (m && m[1]) {
        const val = m[1].trim();
        if (val.length >= 3 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}/.test(val)) {
          return val;
        }
      }
    }
    if (/^(?:PARA|ENVIADO\s+A|DESTINATARIO|TITULAR|BENEFICIARIO|CUENTA\s+DESTINO)\s*:?$/i.test(line)) {
      const next = lines[i + 1];
      if (next && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}/.test(next)) {
        return next;
      }
    }
  }

  // Fallback for Yape/Plin: line immediately following amount line (S/ ...)
  for (let i = 0; i < lines.length - 1; i++) {
    if (/(?:S\s*\/|5\s*\/|\$\s*\/|\bPEN\b)\s*[0-9]+/i.test(lines[i])) {
      const candidate = lines[i + 1];
      const normCand = normalizeText(candidate);
      if (
        candidate.length >= 4 &&
        /[A-Z]{3,}/.test(normCand) &&
        !/(OPERACION|DESTINO|COMPARTIR|NUEVO|FECHA|HORA|YAPEASTE|EXITOS|COMPROBANTE|CELULAR)/.test(
          normCand
        )
      ) {
        return candidate;
      }
    }
  }

  return null;
}

export function extractOperationAndDate(rawText: string): {
  operationNumber: string | null;
  date: string | null;
} {
  const norm = normalizeText(rawText);
  const opMatch = norm.match(
    /(?:OPERACION|N°\s*DE?\s*OP|CONSTANCIA|CODIGO|REFERENCIA|OP)\s*[:.#-]?\s*([0-9]{5,12})/
  );
  const dateMatch = norm.match(
    /\b(\d{1,2}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4}|\d{1,2}\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)[A-Z.]*\s+\d{2,4})\b/
  );
  return {
    operationNumber: opMatch ? opMatch[1] : null,
    date: dateMatch ? dateMatch[1] : null,
  };
}

export async function verifyVoucherWithOcr(
  input: VoucherVerificationInput
): Promise<VoucherVerificationResult> {
  const {
    imageBuffer,
    expectedAmount,
    paymentMethod,
    officialHolder,
  } = input;

  const cleanExpectedAmount = Math.round((Number(expectedAmount) || 0) * 100) / 100;
  const cleanHolder = String(officialHolder || '').trim();

  let primaryText = '';
  let sparseText = '';
  let ocrText = '';
  try {
    const recognized = await recognizeImageText(imageBuffer);
    primaryText = recognized.primaryText;
    sparseText = recognized.sparseText;
    ocrText = recognized.combinedText;
  } catch (err) {
    console.error('Error ejecutando OCR de voucher:', err);
    return {
      success: false,
      isValid: false,
      isLegitimateVoucher: false,
      amountMatches: false,
      recipientMatches: false,
      detectedAmount: null,
      expectedAmount: cleanExpectedAmount,
      detectedRecipientName: null,
      officialHolder: cleanHolder,
      confidence: 'LOW',
      reason: 'No se pudo procesar la imagen del comprobante. Sube una captura nítida en formato PNG o JPG.',
      verificationEngine: 'OCR',
    };
  }

  const normText = normalizeText(ocrText);
  const alphaNumCount = normText.replace(/[^A-Z0-9]/g, '').length;

  // 1. Check readable text
  if (alphaNumCount < 12) {
    return {
      success: true,
      isValid: false,
      isLegitimateVoucher: false,
      amountMatches: false,
      recipientMatches: false,
      detectedAmount: null,
      expectedAmount: cleanExpectedAmount,
      detectedRecipientName: null,
      officialHolder: cleanHolder,
      confidence: 'LOW',
      reason: 'No se pudo leer ningún texto de comprobante en la imagen. Sube una captura nítida y completa del voucher.',
      verificationEngine: 'OCR',
    };
  }

  // 2. Check payment/voucher keywords
  const hasVoucherKeywords =
    /(YAPE|PLIN|BCP|BBVA|INTERBANK|SCOTIABANK|BANCO|TRANSFERENCIA|OPERACION|CONSTANCIA|EXITOS|ENVIADO|PAGASTE|YAPEASTE|ENVIASTE|DESTINO|CUENTA|MONTO|IMPORTE|TITULAR|BENEFICIARIO|CCI|COMPROBANTE|SOLES|PEN|S\s*\/)/.test(
      normText
    );

  if (!hasVoucherKeywords) {
    return {
      success: true,
      isValid: false,
      isLegitimateVoucher: false,
      amountMatches: false,
      recipientMatches: false,
      detectedAmount: null,
      expectedAmount: cleanExpectedAmount,
      detectedRecipientName: null,
      officialHolder: cleanHolder,
      confidence: 'LOW',
      reason: 'La imagen subida no corresponde a un comprobante de pago válido (Yape, Plin o Transferencia Bancaria).',
      verificationEngine: 'OCR',
    };
  }

  // 3. Extract and verify amount
  const { explicitAmounts, fallbackLineAmounts } = extractAmountsFromText(ocrText);
  const candidateAmounts = Array.from(
    new Set(explicitAmounts.length > 0 ? explicitAmounts : fallbackLineAmounts)
  );

  const matchedAmount = candidateAmounts.find(
    (amt) => Math.abs(amt - cleanExpectedAmount) <= 0.05
  );
  const amountMatches = matchedAmount !== undefined;
  const detectedAmount =
    matchedAmount !== undefined
      ? matchedAmount
      : candidateAmounts.length > 0
      ? candidateAmounts[0]
      : null;

  // 4. Verify official holder name in voucher text
  const recipientMatches = doesRecipientMatch(ocrText, cleanHolder);
  const extractedCandidateName =
    extractRecipientCandidateFromText(primaryText) ||
    extractRecipientCandidateFromText(sparseText);
  const detectedRecipientName = recipientMatches
    ? cleanHolder
    : extractedCandidateName;

  const { operationNumber, date } = extractOperationAndDate(ocrText);

  const isValid = amountMatches && recipientMatches;

  let reason = '';
  if (isValid) {
    reason = `Comprobante verificado correctamente (${paymentMethod}): S/ ${cleanExpectedAmount.toFixed(2)} transferidos a ${cleanHolder}.`;
  } else if (!amountMatches && !recipientMatches) {
    const amountDesc =
      detectedAmount !== null
        ? `S/ ${detectedAmount.toFixed(2)}`
        : 'no detectado';
    const nameDesc = detectedRecipientName
      ? `"${detectedRecipientName}"`
      : 'no coincide o no es legible';
    reason = `Voucher rechazado: El monto detectado (${amountDesc}) no coincide con el total de S/ ${cleanExpectedAmount.toFixed(2)}, y el destinatario (${nameDesc}) no coincide con el titular oficial "${cleanHolder}".`;
  } else if (!amountMatches) {
    const amountDesc =
      detectedAmount !== null
        ? `S/ ${detectedAmount.toFixed(2)}`
        : 'no detectado en el comprobante';
    reason = `Monto incorrecto: El voucher muestra ${amountDesc}, pero el monto exacto a cancelar por tus entradas es S/ ${cleanExpectedAmount.toFixed(2)}.`;
  } else {
    const nameDesc = detectedRecipientName
      ? `"${detectedRecipientName}"`
      : 'otro destinatario';
    reason = `Titular no coincide: El comprobante indica ${nameDesc} en lugar de la cuenta oficial "${cleanHolder}".`;
  }

  return {
    success: true,
    isValid,
    isLegitimateVoucher: true,
    amountMatches,
    recipientMatches,
    detectedAmount,
    expectedAmount: cleanExpectedAmount,
    detectedRecipientName,
    detectedOperationNumber: operationNumber,
    detectedDate: date,
    officialHolder: cleanHolder,
    confidence: isValid ? 'HIGH' : 'MEDIUM',
    reason,
    verificationEngine: 'OCR',
  };
}
