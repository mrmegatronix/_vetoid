import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { PRACTICE_DRILL_CARDS } from '../domain/nzIdParser';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildPrintableTestIdsHtml(): string {
  const cardsHtml = PRACTICE_DRILL_CARDS.map((card, idx) => {
    const accent =
      idx === 0
        ? '#00C853'
        : idx === 1
        ? '#D50000'
        : idx === 2
        ? '#FFAB00'
        : '#AA00FF';

    return `
      <div class="id-card" style="border-top: 6px solid ${accent};">
        <div class="watermark">STAFF TRAINING SPECIMEN • NOT VALID ID</div>
        <div class="card-header">
          <span class="card-title">${escapeHtml(card.label)}</span>
          <span class="card-expect" style="color:${accent};">${escapeHtml(card.subtitle)}</span>
        </div>
        <pre class="ocr-block">${escapeHtml(card.rawOcrText)}</pre>
      </div>
    `;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VetoID — Printable Staff Training IDs</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #111;
        margin: 0;
        padding: 0;
      }
      .page-header {
        border-bottom: 2px solid #111;
        padding-bottom: 8px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .page-header h1 { margin: 0; font-size: 20px; }
      .page-header p { margin: 0; font-size: 12px; color: #444; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14mm;
      }
      .id-card {
        border: 2px dashed #333;
        border-radius: 10px;
        padding: 12px 14px;
        min-height: 54mm;
        box-sizing: border-box;
        position: relative;
        background: #fff;
        page-break-inside: avoid;
      }
      .watermark {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: #b91c1c;
        margin-bottom: 6px;
      }
      .card-header {
        margin-bottom: 8px;
      }
      .card-title {
        display: block;
        font-size: 13px;
        font-weight: 800;
      }
      .card-expect {
        display: block;
        font-size: 11px;
        font-weight: 700;
      }
      .ocr-block {
        font-family: "Courier New", Courier, monospace;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.5;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px;
        margin: 0;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .footer-note {
        margin-top: 16px;
        font-size: 11px;
        color: #444;
      }
    </style>
  </head>
  <body>
    <div class="page-header">
      <h1>VetoID — Printable Staff Practice IDs (NZ SSAA 2012)</h1>
      <p>Cut along dashed lines • Scan with VetoID camera to train door staff</p>
    </div>
    <div class="grid">
      ${cardsHtml}
    </div>
    <p class="footer-note">
      <strong>Training Note:</strong> All specimens above contain synthetic test data only.
      Tip: To practise Trespassed Patron alerts, add <code>AB123456</code> to the PIN-gated Trespass Register and scan Card 1.
    </p>
  </body>
</html>`;
}

/**
 * Prints the A4 staff training ID sheet to a printer (native Android/iOS Print dialog or Web window.print).
 */
export async function printTestIdsSheet(): Promise<void> {
  const html = buildPrintableTestIdsHtml();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
      return;
    }
    window.print();
    return;
  }

  await Print.printAsync({ html });
}
