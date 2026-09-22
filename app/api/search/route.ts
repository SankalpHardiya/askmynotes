import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Check logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get question
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // 3. Convert question into embedding
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: question,
      config: {
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
      },
    });

    const queryEmbedding = response.embeddings?.[0]?.values;

    if (!queryEmbedding) {
      throw new Error("Failed to generate question embedding");
    }

    // 4. Search similar document chunks
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,
        match_count: 5,
      }
    );

    if (searchError) {
      throw new Error(searchError.message);
    }

    // 5. Return results
    return NextResponse.json({
      success: true,
      question,
      results: chunks,
    });
  } catch (error) {
    console.error("SEARCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}