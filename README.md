<div align="center">

# Relu Consultancy — Company Research Assistant

**AI-Powered Company Intelligence · Hackathon Submission**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

*Know any company in minutes — research, analyze, and download professional PDF reports.*

**Applicant:** avanirdj2722@gmail.com

</div>

---

## Overview

The **Company Research Assistant** is a full-stack AI application built for the Relu Consultancy AI & Automation Developer hiring hackathon. Users enter a **company name** or **website URL**, and the system automatically:

1. Resolves the official company website (via Serper.dev search)
2. Crawls key pages (Home, About, Products, Services, Contact, Pricing)
3. Synthesizes AI-powered insights using OpenRouter (user-selectable model)
4. Identifies competitors with names and websites
5. Generates a downloadable professional PDF report
6. Optionally auto-posts results to Discord with applicant details and PDF attachment

The interface is a modern, responsive **ChatGPT-style** experience with a configuration sidebar, live progress tracking, and polished dark-theme UI.

---

## Features

| Category | Implementation |
|----------|----------------|
| **Company Research** | Name or URL input, official website resolution, contact info, products/services, AI pain points |
| **Website Crawling** | Cheerio-based crawler with duplicate/login page filtering and parallel page discovery |
| **Search Integration** | Serper.dev for website lookup, contact data, and competitor signals |
| **AI Integration** | OpenRouter with selectable models (Gemini, Claude, Llama) |
| **Competitor Analysis** | AI-identified competitors with name + website |
| **PDF Generation** | Professional amber-accent report via PDFKit |
| **Discord Integration** | Bot token, channel ID, applicant name/email, auto PDF upload |
| **Deployment** | Vercel serverless API + static Vite frontend |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React + Vite Frontend                   │
│  ChatGPT-style UI · Sidebar Config · Progress · PDF Download│
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│              Vercel Serverless Functions (api/)             │
│  /api/research · /api/download-pdf · /api/discord-test      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Serper.dev         OpenRouter          Cheerio Crawler
   (Search)           (AI Analysis)       (Web Scraping)
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                    PDFKit + Discord Bot API
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/config-status` | GET | Reports server-side API key availability |
| `/api/research` | POST | Full research pipeline |
| `/api/download-pdf` | POST | Generate and return PDF binary |
| `/api/discord-test` | POST | Send report + applicant info to Discord |

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Lucide Icons, Vite 6
- **Backend:** Vercel Serverless Functions (`@vercel/node`)
- **Crawling:** Cheerio
- **Search:** Serper.dev API
- **AI:** OpenRouter API (multi-model)
- **PDF:** PDFKit
- **Automation:** Discord Bot API (multipart file upload)
- **Local Dev:** Express + Vite middleware (`server.ts`)

---

## Environment Variables

Configure these in your **Vercel Project Settings → Environment Variables**, or in a local `.env` file for development.

```bash
# Serper.dev — required for search & website resolution
SERPER_API_KEY=your_serper_dev_api_key

# OpenRouter — required for AI analysis & insights
OPENROUTER_API_KEY=your_openrouter_api_key

# Set to production when running the local Express server
NODE_ENV=production
```

> **Note:** API keys can also be entered directly in the sidebar UI. Server-side env vars act as a fallback and show a "Server Active" badge when configured.

---

## Setup & Installation

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- API keys from [Serper.dev](https://serper.dev) and [OpenRouter](https://openrouter.ai)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd company-research-assistant
npm install
```

### 2. Local Development

Starts the Express dev server with Vite HMR on port **3000**:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), configure API keys in the sidebar, and run a research query.

### 3. Local Production Build

Bundles the frontend and Express server for self-hosted deployment (Railway, Render, etc.):

```bash
npm run build:local && npm start
```

### 4. Vercel Deployment

The project is pre-configured for Vercel with `vercel.json` and serverless API routes in `/api`.

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Deploy from project root
vercel

# Production deploy
vercel --prod
```

**Vercel settings (auto-detected from `vercel.json`):**

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Add `SERPER_API_KEY` and `OPENROUTER_API_KEY` in the Vercel dashboard before testing research.

---

## Usage

1. Open the app and go to the **API** tab in the sidebar
2. Enter your **OpenRouter** and **Serper.dev** API keys (or rely on server env vars)
3. Select an **AI Model** from the dropdown
4. *(Optional)* Switch to the **Discord** tab — configure Bot Token, Channel ID, and **Applicant Details**
5. Enter a company name (`Stripe`, `Figma`) or URL (`https://stripe.com`) in the bottom search bar
6. Click **Research →** and watch live progress indicators
7. Review results: company info, products, pain points, competitors
8. **Download PDF Report** or confirm **Sent to Discord**

---

## Project Structure

```
company-research-assistant/
├── api/                    # Vercel serverless functions
│   ├── research.ts
│   ├── download-pdf.ts
│   ├── discord-test.ts
│   ├── config-status.ts
│   └── health.ts
├── server/                 # Shared backend logic
│   ├── research.ts         # Research orchestration pipeline
│   ├── crawler.ts          # Cheerio website crawler
│   ├── search.ts           # Serper.dev integration
│   ├── pdf.ts              # PDFKit report generator
│   └── discord.ts          # Discord bot file upload
├── src/                    # React frontend
│   ├── App.tsx             # Main ChatGPT-style UI
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── main.tsx
│   └── index.css
├── server.ts               # Local Express dev/production server
├── vercel.json             # Vercel deployment config
├── vite.config.ts
├── package.json
└── README.md
```

---

## Hackathon Scoring Alignment

| Criteria | Points | Status |
|----------|--------|--------|
| Company Research | 15 | ✅ Name + URL input, website resolution, contact, products, pain points |
| Website Crawling & Extraction | 15 | ✅ Multi-page Cheerio crawl with dedup & filtering |
| OpenRouter AI Integration | 15 | ✅ Model selection + structured JSON synthesis |
| Serper.dev Integration | 10 | ✅ Search, contact, competitor enrichment |
| Competitor Analysis | 10 | ✅ Name + website per competitor |
| PDF Report Generation | 10 | ✅ Professional amber-accent PDF |
| Deployment & Documentation | 5 | ✅ Vercel-ready + this README |
| Discord Integration (Bonus) | 10 | ✅ Auto-post with applicant details + PDF |
| Additional Enhancements (Bonus) | 10 | ✅ Polished UI, progress tracking, server key fallback |

---

## Submission Details

| Field | Value |
|-------|-------|
| **Applicant Email** | avanirdj2722@gmail.com |
| **GitHub Repository** | *(add your public repo URL after push)* |
| **Deployed URL** | *(add your Vercel URL after deploy)* |

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Local dev server (Express + Vite HMR) |
| `npm run build` | Build frontend for Vercel (`dist/`) |
| `npm run build:local` | Build frontend + Express bundle for self-hosting |
| `npm start` | Run local production Express server |
| `npm run lint` | TypeScript type check (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` build output |

---

## License

Built for the Relu Consultancy AI & Automation Developer Hiring Hackathon.

---

<div align="center">

**Relu Consultancy · Company Intelligence**

*Powered by OpenRouter · Serper.dev · PDFKit*

</div>
