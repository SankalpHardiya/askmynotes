# AskMyNotes

> A personal knowledge base that lets you ask questions directly from your own documents.

AskMyNotes is a **RAG-based document question-answering application**. Upload your PDF or DOCX notes, and ask questions about their contents. The application retrieves relevant sections from your documents and uses them as context to generate grounded answers.

## What it does

* Upload PDF and DOCX documents
* Extract and process document text
* Split documents into overlapping chunks
* Generate semantic embeddings
* Store embeddings with PostgreSQL + pgvector
* Retrieve relevant chunks using vector similarity search
* Generate answers using Groq
* Show the documents and chunks used for an answer
* Keep documents isolated between users
* Delete uploaded documents and their processed data

## How it works

```text
                    Upload
                      │
                      ▼
                PDF / DOCX
                      │
                      ▼
              Text Extraction
                      │
                      ▼
                  Chunking
                      │
                      ▼
             Gemini Embeddings
                      │
                      ▼
              PostgreSQL
               + pgvector
                      │
                      │
        ──────────────┼──────────────
                      │
                   Question
                      │
                      ▼
             Query Embedding
                      │
                      ▼
             Vector Similarity
                   Search
                      │
                      ▼
              Relevant Chunks
                      │
                      ▼
                    Groq
                      │
                      ▼
                 Grounded
                   Answer
```

## Architecture

```text
Next.js
│
├── Frontend
│   ├── Landing page
│   ├── Authentication
│   └── Dashboard
│
└── API Routes
    ├── /api/process
    │   └── Document ingestion
    │
    ├── /api/search
    │   └── Vector retrieval
    │
    ├── /api/chat
    │   └── RAG question answering
    │
    └── /api/delete
        └── Document deletion


Supabase
│
├── Auth
├── Storage
└── PostgreSQL
    ├── documents
    └── document_chunks
        └── vector(768)
```

## RAG Pipeline

### 1. Document ingestion

When a document is uploaded:

```text
PDF / DOCX
    ↓
Text extraction
    ↓
Text cleaning
    ↓
Overlapping chunks
    ↓
Gemini embeddings
    ↓
PostgreSQL + pgvector
```

PDF files are processed with `pdf2json`, while DOCX files are processed with `Mammoth`.

### 2. Question answering

When a user asks a question:

```text
Question
   ↓
Gemini query embedding
   ↓
Vector similarity search
   ↓
Relevant document chunks
   ↓
Context construction
   ↓
Groq
   ↓
Answer + sources
```

The retrieval function is scoped to the authenticated user so that document chunks from other users are not included in the search.

## Tech Stack

| Layer           | Technology                    |
| --------------- | ----------------------------- |
| Frontend        | Next.js, React, TypeScript    |
| Styling         | Tailwind CSS                  |
| Authentication  | Supabase Auth                 |
| File Storage    | Supabase Storage              |
| Database        | PostgreSQL                    |
| Vector Search   | pgvector                      |
| Embeddings      | Gemini `gemini-embedding-001` |
| LLM             | Groq `openai/gpt-oss-20b`     |
| PDF Processing  | pdf2json                      |
| DOCX Processing | Mammoth                       |

## Project Structure

```text
app/
├── api/
│   ├── chat/
│   ├── delete/
│   ├── process/
│   └── search/
│
├── dashboard/
├── login/
├── signup/
└── page.tsx

lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
├── chunkText.ts
└── embeddings.ts
```

## Data Model

The application keeps the original files separate from their processed text and embeddings.

```text
auth.users
     │
     │ user_id
     ▼
documents
     │
     │ document_id
     ▼
document_chunks
     │
     └── embedding vector(768)
```

Original PDF/DOCX files are stored privately in Supabase Storage.

Row Level Security and user-scoped queries ensure that users can only access their own documents and processed chunks.

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd askmynotes
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file using `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

GEMINI_API_KEY=
GROQ_API_KEY=
```

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Database Setup

AskMyNotes requires:

* Supabase Auth
* A private `notes` Storage bucket
* PostgreSQL
* pgvector
* `documents` table
* `document_chunks` table
* Row Level Security policies
* `match_document_chunks` PostgreSQL function

The required database configuration can be found in the project's SQL setup.

## Environment & Security

API keys are loaded through environment variables and should never be committed to the repository.

```text
.env.local      → local only
.env.example    → safe to commit
```

User-level access is enforced through Supabase Auth, Row Level Security, Storage policies, and user-scoped vector retrieval.

## Current Scope

AskMyNotes is intentionally kept simple:

* Single Next.js application
* Supabase as the backend infrastructure
* PostgreSQL + pgvector for retrieval
* Gemini for embeddings
* Groq for generation

No external vector database, orchestration framework, or separate backend service is required for the current version.

---

Built as a practical implementation of a **retrieval-augmented generation pipeline**, from document ingestion to grounded question answering.
