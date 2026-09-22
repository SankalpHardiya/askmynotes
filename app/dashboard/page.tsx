"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowUp,
  FileText,
  LogOut,
  Paperclip,
  Plus,
  Search,
  Upload,
  Trash2,
  X,
} from "lucide-react";

type Document = {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  created_at: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type Source = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
};

export default function Dashboard() {
  const supabase = createClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // -----------------------------------
  // DELETE DOCUMENT
  // -----------------------------------

  async function deleteDocument(documentId: string) {
    const document = documents.find(
      (doc) => doc.id === documentId
    );

    if (!document) return;

    const confirmed = window.confirm(
      `Delete "${document.name}"?\n\nThis will also delete its indexed chunks.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(documentId);

    try {
      const response = await fetch("/api/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to delete document."
        );
      }

      // Remove from UI immediately
      setDocuments((current) =>
        current.filter(
          (doc) => doc.id !== documentId
        )
      );

      setMessage("Document deleted.");
    } catch (error) {
      console.error("DELETE DOCUMENT ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete document."
      );
    } finally {
      setDeleting(null);
    }
  }

  // -----------------------------------
  // LOAD USER + DOCUMENTS
  // -----------------------------------

  useEffect(() => {
    loadUser();
    loadDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      setUserEmail(user.email);
    }
  }

  async function loadDocuments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (!error && data) {
      setDocuments(data);
    }
  }

  // -----------------------------------
  // UPLOAD DOCUMENT
  // -----------------------------------

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF and DOCX files are supported.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const filePath = `${user.id}/${file.name}`;

      // Upload original file
      const { error: uploadError } =
        await supabase.storage
          .from("notes")
          .upload(filePath, file, {
            upsert: true,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Create document metadata
      const {
        data: document,
        error: documentError,
      } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
        })
        .select()
        .single();

      if (documentError || !document) {
        throw new Error(
          documentError?.message ||
            "Could not create document."
        );
      }

      // Process document
      const processResponse = await fetch(
        "/api/process",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: document.id,
          }),
        }
      );

      const processResult =
        await processResponse.json();

      if (!processResponse.ok) {
        throw new Error(
          processResult.error ||
            "Processing failed."
        );
      }

      await loadDocuments();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I've processed ${file.name}. You can now ask questions about it.`,
        },
      ]);

      setShowUpload(false);
    } catch (error) {
      console.error("UPLOAD ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // -----------------------------------
  // ASK QUESTION
  // -----------------------------------

  async function askQuestion() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    setQuestion("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (error) {
      console.error("CHAT ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong while answering.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // LOGOUT
  // -----------------------------------

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // -----------------------------------
  // MESSAGE HELPER
  // -----------------------------------

  function setMessage(message: string) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: message,
      },
    ]);
  }

  // -----------------------------------
  // FILTER DOCUMENTS
  // -----------------------------------

  const filteredDocuments = documents.filter((doc) =>
    doc.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <main className="h-screen overflow-hidden bg-[#f7f7f5] text-[#181818]">
      <div className="flex h-full">

        {/* ========================= */}
        {/* SIDEBAR */}
        {/* ========================= */}

        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#deded9] bg-[#f3f3f0]">

          {/* Brand */}
          <div className="flex h-[72px] items-center border-b border-[#deded9] px-6">
            <div className="flex items-center gap-3">

              <div className="flex h-8 w-8 items-center justify-center bg-[#181818] text-sm font-semibold text-white">
                A
              </div>

              <span className="text-[15px] font-semibold tracking-[-0.02em]">
                AskMyNotes
              </span>

            </div>
          </div>

          {/* Search */}
          <div className="px-4 pt-5">
            <div className="relative">

              <Search
                size={15}
                strokeWidth={1.7}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search notes"
                className="h-9 w-full border border-[#d9d9d4] bg-[#fafaf8] pl-9 pr-3 text-[13px] outline-none placeholder:text-[#999] focus:border-[#aaa]"
              />

            </div>
          </div>

          {/* Notes header */}
          <div className="flex items-center justify-between px-5 pb-2 pt-7">

            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a8a84]">
              Your notes
            </span>

            <button
              onClick={() => setShowUpload(true)}
              className="text-[#777] transition hover:text-[#181818]"
              title="Add note"
            >
              <Plus
                size={17}
                strokeWidth={1.7}
              />
            </button>

          </div>

          {/* Documents */}
          <div className="flex-1 overflow-y-auto px-3">

            {filteredDocuments.length === 0 ? (

              <div className="px-3 py-8 text-center">

                <FileText
                  size={22}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#aaa]"
                />

                <p className="text-[12px] text-[#888]">
                  No notes yet
                </p>

              </div>

            ) : (

              <div className="space-y-0.5">

                {filteredDocuments.map((doc) => (

                  <div
                    key={doc.id}
                    className="group flex items-center gap-2 px-3 py-2.5"
                  >

                    {/* File icon */}
                    <FileText
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 text-[#777]"
                    />

                    {/* File name */}
                    <div className="min-w-0 flex-1">

                      <p className="truncate text-[13px] text-[#303030]">
                        {doc.name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#999]">
                        {doc.file_type ===
                        "application/pdf"
                          ? "PDF"
                          : "DOCX"}
                      </p>

                    </div>

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() =>
                        deleteDocument(doc.id)
                      }
                      disabled={
                        deleting === doc.id
                      }
                      className="flex h-7 w-7 shrink-0 items-center justify-center text-[#aaa] opacity-0 transition hover:bg-[#e8e8e4] hover:text-[#181818] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Delete document"
                    >

                      <Trash2
                        size={14}
                        strokeWidth={1.6}
                      />

                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* Bottom user */}
          <div className="border-t border-[#deded9] p-4">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="truncate text-[12px] text-[#444]">
                  {userEmail || "Account"}
                </p>

                <p className="mt-0.5 text-[10px] text-[#999]">
                  Personal workspace
                </p>

              </div>

              <button
                onClick={logout}
                className="text-[#888] transition hover:text-[#181818]"
                title="Log out"
              >
                <LogOut
                  size={16}
                  strokeWidth={1.6}
                />
              </button>

            </div>

          </div>

        </aside>

        {/* ========================= */}
        {/* MAIN */}
        {/* ========================= */}

        <section className="flex min-w-0 flex-1 flex-col">

          {/* Top bar */}
          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#deded9] px-8">

            <div>

              <h1 className="text-[15px] font-medium tracking-[-0.02em]">
                Notes
              </h1>

              <p className="mt-0.5 text-[11px] text-[#999]">
                {documents.length}{" "}
                {documents.length === 1
                  ? "document"
                  : "documents"}
              </p>

            </div>

            <button
              onClick={() => setShowUpload(true)}
              className="flex h-9 items-center gap-2 border border-[#d4d4cf] bg-[#fafaf8] px-3.5 text-[12px] font-medium transition hover:border-[#aaa] hover:bg-white"
            >

              <Upload
                size={14}
                strokeWidth={1.7}
              />

              Add note

            </button>

          </header>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto">

            <div className="mx-auto w-full max-w-[820px] px-6 pb-40 pt-12">

              {messages.length === 0 ? (

                <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">

                  <div className="mb-7 flex h-11 w-11 items-center justify-center border border-[#d8d8d3] bg-[#fafaf8]">

                    <FileText
                      size={20}
                      strokeWidth={1.4}
                      className="text-[#555]"
                    />

                  </div>

                  <h2 className="text-[27px] font-medium tracking-[-0.04em]">
                    Ask your notes.
                  </h2>

                  <p className="mt-3 max-w-[420px] text-[13px] leading-6 text-[#8a8a84]">
                    Search across your uploaded
                    documents and get answers
                    grounded in the material you
                    provided.
                  </p>

                  {documents.length === 0 && (

                    <button
                      onClick={() =>
                        setShowUpload(true)
                      }
                      className="mt-7 flex items-center gap-2 border border-[#d2d2cd] bg-white px-4 py-2.5 text-[12px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[#aaa]"
                    >

                      <Plus size={14} />

                      Upload your first note

                    </button>

                  )}

                </div>

              ) : (

                <div className="space-y-10">

                  {messages.map(
                    (message, index) => (

                      <div key={index}>

                        {message.role ===
                        "user" ? (

                          <div className="flex justify-end">

                            <div className="max-w-[75%] bg-[#181818] px-4 py-3 text-[13px] leading-6 text-white">
                              {message.content}
                            </div>

                          </div>

                        ) : (

                          <div>

                            <div className="max-w-[760px] whitespace-pre-wrap text-[14px] leading-7 text-[#303030]">
                              {message.content}
                            </div>

                            {message.sources &&
                              message.sources
                                .length > 0 && (

                                <div className="mt-6 border-t border-[#e0e0db] pt-4">

                                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#999]">
                                    Sources
                                  </p>

                                  <div className="flex flex-wrap gap-2">

                                    {message.sources.map(
                                      (
                                        source,
                                        sourceIndex
                                      ) => (

                                        <div
                                          key={
                                            sourceIndex
                                          }
                                          className="flex items-center gap-2 border border-[#deded9] bg-[#fafaf8] px-3 py-2"
                                        >

                                          <FileText
                                            size={
                                              13
                                            }
                                            strokeWidth={
                                              1.5
                                            }
                                            className="text-[#777]"
                                          />

                                          <div>

                                            <p className="max-w-[180px] truncate text-[11px] font-medium text-[#444]">
                                              {
                                                source.documentName
                                              }
                                            </p>

                                            <p className="text-[10px] text-[#999]">
                                              Chunk{" "}
                                              {
                                                source.chunkIndex
                                              }
                                            </p>

                                          </div>

                                        </div>

                                      )
                                    )}

                                  </div>

                                </div>

                              )}

                          </div>

                        )}

                      </div>

                    )
                  )}

                  {loading && (

                    <div className="flex items-center gap-2 text-[13px] text-[#999]">

                      <span className="h-1.5 w-1.5 animate-pulse bg-[#777]" />

                      Searching your notes...

                    </div>

                  )}

                  <div ref={chatEndRef} />

                </div>

              )}

            </div>

          </div>

          {/* Composer */}
          <div className="pointer-events-none absolute bottom-0 left-[280px] right-0">

            <div className="mx-auto max-w-[820px] px-6 pb-6">

              <div className="pointer-events-auto border border-[#d4d4cf] bg-[#fafaf8] shadow-[0_8px_30px_rgba(0,0,0,0.05)]">

                <div className="flex items-end gap-2 p-2">

                  <button
                    onClick={() =>
                      setShowUpload(true)
                    }
                    className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[#888] transition hover:text-[#222]"
                    title="Attach note"
                  >

                    <Paperclip
                      size={17}
                      strokeWidth={1.6}
                    />

                  </button>

                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) =>
                      setQuestion(e.target.value)
                    }
                    onKeyDown={(e) => {

                      if (
                        e.key === "Enter" &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        askQuestion();
                      }

                    }}
                    placeholder="Ask something about your notes..."
                    rows={1}
                    className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[13px] leading-5 outline-none placeholder:text-[#999]"
                  />

                  <button
                    onClick={askQuestion}
                    disabled={
                      !question.trim() ||
                      loading
                    }
                    className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-[#181818] text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-25"
                  >

                    <ArrowUp
                      size={16}
                      strokeWidth={1.8}
                    />

                  </button>

                </div>

                <div className="px-3 pb-2">

                  <p className="text-[9px] text-[#aaa]">
                    Answers are generated from your
                    uploaded notes.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

      </div>

      {/* ========================= */}
      {/* UPLOAD MODAL */}
      {/* ========================= */}

      {showUpload && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-5">

          <div className="w-full max-w-[440px] border border-[#d5d5d0] bg-[#fafaf8] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h3 className="text-[16px] font-medium tracking-[-0.02em]">
                  Add a note
                </h3>

                <p className="mt-1 text-[11px] text-[#999]">
                  Upload a PDF or DOCX document.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowUpload(false)
                }
                disabled={uploading}
                className="text-[#888] hover:text-[#222]"
              >

                <X
                  size={18}
                  strokeWidth={1.6}
                />

              </button>

            </div>

            <label className="group flex cursor-pointer flex-col items-center justify-center border border-dashed border-[#cfcfc9] bg-[#f5f5f2] px-6 py-12 text-center transition hover:border-[#999] hover:bg-white">

              <Upload
                size={22}
                strokeWidth={1.4}
                className="mb-4 text-[#777]"
              />

              <p className="text-[13px] font-medium">
                {uploading
                  ? "Processing document..."
                  : "Choose a document"}
              </p>

              <p className="mt-2 text-[11px] text-[#999]">
                PDF or DOCX
              </p>

              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />

            </label>

            {uploading && (

              <p className="mt-4 text-center text-[11px] text-[#888]">
                Extracting text, creating chunks and
                generating embeddings...
              </p>

            )}

          </div>

        </div>

      )}

    </main>
  );
}