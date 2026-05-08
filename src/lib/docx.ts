import mammoth from 'mammoth';

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  if (result.messages && result.messages.length > 0) {
    console.warn('Mammoth extraction messages:', result.messages);
  }

  // Sanitize MS Word special characters that often break into '?' or '-'
  return result.value
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Smart quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, "-") // En/Em dashes
    .replace(/\u2026/g, "...") // Ellipsis
    .replace(/\u00A0/g, " "); // Non-breaking space
}
