/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Note: pdfjs-dist is quite large and can be tricky to load in some environments
// We'll use a dynamic import approach or assume it's available.
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker from node_modules via Vite asset import
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}
