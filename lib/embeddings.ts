import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function generateEmbeddings(texts: string[]) {
  const allEmbeddings: number[][] = [];

  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: batch,
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768,
      },
    });

    const embeddings =
      response.embeddings?.map(
        (embedding) => embedding.values
      ) ?? [];

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}