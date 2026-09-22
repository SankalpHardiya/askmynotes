import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#181818]">
      {/* NAVBAR */}
      <header className="border-b border-[#deded9]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center bg-[#181818] text-sm font-semibold text-white">
              A
            </div>

            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              AskMyNotes
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-[12px] font-medium text-[#555] transition hover:text-[#181818]"
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="bg-[#181818] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#333]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-24 lg:px-8 lg:pb-32 lg:pt-32">
        <div className="max-w-3xl">
          <p className="mb-7 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a84]">
            Your documents. One place to ask.
          </p>

          <h1 className="text-5xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">
            Ask questions.
            <br />
            Get answers from
            <br />
            <span className="text-[#888]">
              your notes.
            </span>
          </h1>

          <p className="mt-8 max-w-[520px] text-[15px] leading-7 text-[#70706a]">
            AskMyNotes turns your PDFs and documents into
            a searchable knowledge base. Upload your notes,
            ask a question, and get an answer grounded in
            what you actually uploaded.
          </p>

          <div className="mt-9 flex items-center gap-3">
            <Link
              href="/signup"
              className="bg-[#181818] px-5 py-3 text-[12px] font-medium text-white transition hover:bg-[#333]"
            >
              Start with your notes
            </Link>

            <Link
              href="/login"
              className="border border-[#d2d2cd] bg-white px-5 py-3 text-[12px] font-medium text-[#444] transition hover:border-[#aaa]"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-[#deded9] bg-[#f3f3f0]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="mb-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a84]">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em]">
              From document to answer.
            </h2>
          </div>

          <div className="grid border-l border-t border-[#d8d8d3] md:grid-cols-3">
            <Step
              number="01"
              title="Upload"
              description="Add your PDF or DOCX files. Your documents stay tied to your private workspace."
            />

            <Step
              number="02"
              title="Ask"
              description="Ask questions in plain language instead of searching through pages manually."
            />

            <Step
              number="03"
              title="Understand"
              description="AskMyNotes finds the relevant parts of your documents and uses them to build an answer."
            />
          </div>
        </div>
      </section>

      {/* SIMPLE EXPLANATION */}
      <section className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a84]">
              Built around your notes
            </p>

            <h2 className="mt-4 text-4xl font-medium leading-tight tracking-[-0.045em]">
              Stop hunting through
              <br />
              documents.
            </h2>

            <p className="mt-6 max-w-[440px] text-[14px] leading-7 text-[#777]">
              AskMyNotes uses retrieval to find the pieces
              of your documents that matter to your question
              before generating an answer.
            </p>
          </div>

          <div className="border border-[#d8d8d3] bg-[#fafaf8]">
            <div className="border-b border-[#deded9] px-5 py-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#999]">
                Example
              </span>
            </div>

            <div className="space-y-7 p-6 sm:p-8">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-[#999]">
                  You ask
                </p>

                <p className="text-[15px] leading-6">
                  "What did Moseley discover about atomic
                  number?"
                </p>
              </div>

              <div className="h-px bg-[#e3e3de]" />

              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-[#999]">
                  AskMyNotes
                </p>

                <p className="text-[14px] leading-7 text-[#444]">
                  Moseley showed that the characteristic
                  X-ray frequencies of elements are related
                  systematically to their atomic numbers.
                  The relevant material is found in your
                  uploaded chemistry notes.
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-[#e3e3de] pt-4">
                <div className="h-1.5 w-1.5 bg-[#555]" />

                <span className="text-[10px] text-[#999]">
                  Source · book.pdf · Chunk 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#deded9]">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center lg:px-8 lg:py-28">
          <h2 className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
            Your notes are waiting.
          </h2>

          <p className="mx-auto mt-4 max-w-md text-[13px] leading-6 text-[#888]">
            Upload your first document and start asking
            questions.
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-flex bg-[#181818] px-5 py-3 text-[12px] font-medium text-white transition hover:bg-[#333]"
          >
            Create your workspace
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#deded9]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
          <span className="text-[11px] text-[#999]">
            © 2026 AskMyNotes
          </span>

          <span className="text-[11px] text-[#aaa]">
            Your documents. Your answers.
          </span>
        </div>
      </footer>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[230px] border-b border-r border-[#d8d8d3] p-7 lg:p-8">
      <span className="text-[10px] font-medium tracking-[0.12em] text-[#999]">
        {number}
      </span>

      <h3 className="mt-14 text-[18px] font-medium tracking-[-0.02em]">
        {title}
      </h3>

      <p className="mt-3 max-w-[270px] text-[12px] leading-6 text-[#85857f]">
        {description}
      </p>
    </div>
  );
}