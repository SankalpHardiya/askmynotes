import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Get logged-in user
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

    // Get document belonging to current user
    const { data: document, error: documentError } =
      await supabase
        .from("documents")
        .select("id, file_path")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete document from database.
    // document_chunks will be deleted automatically
    // because of ON DELETE CASCADE.
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // Delete original file from Storage
    const { error: storageError } =
      await supabase.storage
        .from("notes")
        .remove([document.file_path]);

    if (storageError) {
      console.error(
        "STORAGE DELETE ERROR:",
        storageError
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

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