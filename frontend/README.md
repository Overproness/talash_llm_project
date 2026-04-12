# TALASH Frontend

Next.js 14 frontend for the TALASH Smart HR Recruitment platform. Provides a UI for uploading CVs, browsing candidate profiles, comparing candidates, and managing LLM provider settings.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**

## Prerequisites

- Node.js 18+
- TALASH backend running at `http://localhost:8000` (or configure `NEXT_PUBLIC_API_URL`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see below)
cp .env.local.example .env.local   # or create .env.local manually
```

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# URL of the TALASH backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Other Scripts

```bash
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Pages

| Route              | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `/`                | CV upload page — drag-and-drop or browse PDF files        |
| `/dashboard`       | Overview dashboard with candidate statistics              |
| `/candidates`      | Paginated list of all parsed candidates                   |
| `/candidates/[id]` | Full candidate profile view                               |
| `/compare`         | Side-by-side candidate comparison                         |
| `/email-drafts`    | AI-generated email drafts for candidates                  |
| `/settings`        | LLM provider configuration (Ollama, Gemini, OpenAI, Grok) |

## Docker

```bash
# Build and run with Docker Compose (from the project root)
docker-compose up --build frontend
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout (Sidebar + TopBar)
│   ├── page.tsx             # CV upload page
│   ├── dashboard/           # Dashboard page
│   ├── candidates/          # Candidate list + [id] detail page
│   ├── compare/             # Candidate comparison page
│   ├── email-drafts/        # Email drafts page
│   └── settings/            # LLM settings page
├── components/
│   ├── ui/
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   └── TopBar.tsx       # Top navigation bar
│   ├── candidate/           # Candidate-specific components
│   └── charts/              # Chart components
├── lib/
│   ├── api.ts               # API client (wraps fetch calls to the backend)
│   └── types.ts             # Shared TypeScript types
├── .env.local
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```
