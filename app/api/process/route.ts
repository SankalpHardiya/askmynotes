import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { chunkText } from "@/lib/chunkText";
import { generateEmbeddings } from "@/lib/embeddings";
export const runtime = "nodejs";

function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (error: any) => {
      reject(error.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const text = pdfData.Pages.map((page: any) =>
          page.Texts.map((item: any) => {
            try {
              return decodeURIComponent(item.R[0].T);
            } catch {
              return item.R[0].T;
            }
          }).join(" ")
        ).join("\n");

        resolve(text);
      } catch (error) {
        reject(error);
      }
    });

    parser.parseBuffer(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("notes")
      .download(document.file_path);

    if (downloadError || !file) {
      return NextResponse.json(
        { error: "Could not download file" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";

    if (document.file_type === "application/pdf") {
      text = await extractPdfText(buffer);
    } else if (
      document.file_type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({
        buffer,
      });

      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);

const embeddings = await generateEmbeddings(chunks);

const chunkRows = chunks.map((content, index) => ({
  document_id: document.id,
  user_id: user.id,
  content,
  chunk_index: index,
  embedding: embeddings[index],
}));

const { error: chunkError } = await supabase
  .from("document_chunks")
  .insert(chunkRows);

if (chunkError) {
  throw new Error(chunkError.message);
}


return NextResponse.json({
  success: true,
  documentId: document.id,
  fileName: document.name,
  characters: text.length,
  chunks: chunks.length,
});
  } catch (error) {
    console.error("PROCESS ERROR:", error);

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