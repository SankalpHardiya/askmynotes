import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: Request) {
  try {
    // -----------------------------------
    // 1. Create Supabase client
    // -----------------------------------

    const supabase = await createClient();

    // -----------------------------------
    // 2. Get logged-in user
    // -----------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // -----------------------------------
    // 3. Get question
    // -----------------------------------

    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 4. Convert question into embedding
    // -----------------------------------

    const embeddingResponse =
      await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: question,
        config: {
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768,
        },
      });

    const queryEmbedding =
      embeddingResponse.embeddings?.[0]?.values;

    if (!queryEmbedding) {
      throw new Error(
        "Failed to generate question embedding"
      );
    }

    // -----------------------------------
    // 5. Search user's document chunks
    // -----------------------------------

    const {
      data: chunks,
      error: searchError,
    } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: queryEmbedding,

        // Retrieve more candidates.
        match_count: 10,
      }
    );

    if (searchError) {
      throw new Error(searchError.message);
    }

    // -----------------------------------
    // 6. No results
    // -----------------------------------

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "I couldn't find that in your notes.",
        sources: [],
      });
    }

    // -----------------------------------
    // 7. Remove weak matches
    // -----------------------------------

    const relevantChunks = chunks.filter(
      (chunk: { similarity: number }) =>
        chunk.similarity >= 0.55
    );

    // -----------------------------------
    // 8. If nothing is relevant enough
    // -----------------------------------

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "I couldn't find that in your notes.",
        sources: [],
      });
    }

    // -----------------------------------
    // 9. Build context for the LLM
    // -----------------------------------

    const context = relevantChunks
      .map(
        (chunk: {
          content: string;
          chunk_index: number;
          document_name: string;
        }) => {
          return `
[Document: ${chunk.document_name}]
[Chunk: ${chunk.chunk_index}]

${chunk.content}
          `.trim();
        }
      )
      .join("\n\n---\n\n");

    // -----------------------------------
    // 10. Ask Groq
    // -----------------------------------

    const completion =
      await groq.chat.completions.create({
        messages: [
          {
            role: "system",

            content: `
You are AskMyNotes, a document question-answering assistant.

Your job is to answer the user's question ONLY from
the provided document context.

STRICT RULES:

1. Use ONLY information explicitly supported by the context.

2. Do NOT use your general knowledge.

3. Do NOT guess.

4. Do NOT infer an answer just because a word in the
   question appears somewhere in the context.

5. If the answer is not clearly supported by the context,
   respond exactly:

"I couldn't find that in your notes."

6. If the context contains only part of the answer,
   give only the supported part and clearly state that
   the available context is incomplete.

7. For questions asking for a list, include all items
   that are supported by the provided context.

8. For questions asking about numbers, dates, counts,
   names, schedules, or specific facts, copy the
   information accurately from the context.

9. Pay close attention to the actual meaning of the
   question.

10. Never confuse similar terms.

For example:
If the question asks which section has the heaviest
weight, do not answer with a topic containing the word
"weighted". Look for the actual statement about the
section's weight.

Before answering, check:

- Is the answer directly present?
- Does the context contain enough information?
- Am I making an assumption?
- Am I confusing two similar concepts?

If the answer is not directly supported, use:

"I couldn't find that in your notes."

DOCUMENT CONTEXT:

${context}
            `.trim(),
          },

          {
            role: "user",
            content: question,
          },
        ],

        model: "openai/gpt-oss-20b",
      });

    // -----------------------------------
    // 11. Get generated answer
    // -----------------------------------

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer.";

    // -----------------------------------
    // 12. Return answer + sources
    // -----------------------------------

    return NextResponse.json({
      success: true,

      answer,

      sources: relevantChunks.map(
        (chunk: {
          document_id: string;
          document_name: string;
          chunk_index: number;
          similarity: number;
        }) => ({
          documentId: chunk.document_id,
          documentName: chunk.document_name,
          chunkIndex: chunk.chunk_index,
          similarity: chunk.similarity,
        })
      ),
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);

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