export function chunkText(
  text: string,
  chunkSize = 1500,
  overlap = 300
) {
  const cleanedText = text
    .replace(/\s+/g, " ")
    .trim();

  const chunks: string[] = [];

  let start = 0;

  while (start < cleanedText.length) {
    let end = Math.min(
      start + chunkSize,
      cleanedText.length
    );

    // Try to end the chunk at a sentence boundary.
    if (end < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf(".", end);

      if (lastPeriod > start + 800) {
        end = lastPeriod + 1;
      }
    }

    const chunk = cleanedText
      .slice(start, end)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleanedText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}