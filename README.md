# ArchFlow

ArchFlow is a visual architecture workspace for turning system ideas into structured HLD diagrams and LLD UML models. It helps teams plan, review, document, and collaboratively refine software designs by combining graph editing, AI-assisted analysis, rich implementation context, persistence, version history, and real-time collaboration.

## Live Application

- Frontend: [https://archflow-self.vercel.app](https://archflow-self.vercel.app)
- Backend health: [https://archflow-api-jyqq.onrender.com/api/health](https://archflow-api-jyqq.onrender.com/api/health)

The Render free instance may need a short cold start after a period without traffic.

## Features

### HLD Workspace

- Architecture nodes for clients, gateways, services, databases, caches, queues, and external APIs
- Directed connections with selectable and removable edges
- One-click layered cleanup
- Dynamic Groq AI analysis with rule-based fallback
- Safe application of suggested architecture components

### LLD Workspace

- UML classes, interfaces, abstract classes, and enums
- Association, dependency, inheritance, implementation, aggregation, and composition
- Four-sided connection handles, multiplicities, visibility, attributes, and methods
- LLD-focused AI review and reusable design templates

### Shared Product Features

- Guest-first editing with authentication required only for account-backed operations
- MongoDB persistence and recent boards
- Create blank, rename, duplicate, delete, and leave shared boards
- Undo/redo and keyboard shortcuts
- PNG, PDF, and JSON import/export
- Version history with restore
- Links, code snippets, notes, ownership, endpoints, and small file attachments
- Editor and viewer share links
- Collaborator role management, link revocation, participant presence, and live cursors
- Optional Redis-backed Socket.IO fanout for multi-instance deployments

## Architecture

```text
                         +----------------------+
                         |   Vercel Frontend    |
                         | React + TypeScript   |
                         | React Flow + Vite    |
                         +----------+-----------+
                                    |
                          HTTPS + Socket.IO
                                    |
                         +----------v-----------+
                         |    Render Backend    |
                         | Node.js + Express    |
                         | REST + Socket.IO     |
                         +----+------------+----+
                              |            |
                       +------v-----+  +---v----------------+
                       | MongoDB    |  | Groq AI API        |
                       | permanent  |  | HLD/LLD analysis   |
                       | data       |  +--------------------+
                       +------------+

Optional multi-instance path:

Backend instance A ----+
                       +---- Redis ---- Socket.IO fanout
Backend instance B ----+                 and live room state
```

MongoDB is the source of truth for users, boards, collaborators, and version history. Redis is optional for a single backend instance and is used only for scalable real-time state and event distribution.

## Repository Structure

```text
ArchFlow/
  backend/             Express API, MongoDB repositories, AI and collaboration
  frontend/            React application and graph editors
  e2e/                 Playwright browser workflows
  playwright.config.ts
  implementation_plan.md
```

## Local Setup

Requirements:

- Node.js 22
- npm
- MongoDB database
- Optional Groq API key
- Optional Redis server

Install dependencies:

```bash
npm ci --include=dev
```

Create `backend/.env.local`:

```env
PORT=4000
WEB_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/ArchFlow_Dev
AUTH_SECRET=<at-least-32-random-characters>
GROQ_API_KEY=<optional-groq-key>
GROQ_MODEL=openai/gpt-oss-20b
REDIS_URL=redis://localhost:6379
```

`REDIS_URL` can be omitted for local single-instance collaboration.

The frontend defaults to `http://localhost:4000`. To override it, create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:4000
```

Start both applications:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Commands

```bash
npm run dev          # frontend and backend development servers
npm run typecheck    # TypeScript checks for both workspaces
npm test             # backend and frontend unit tests
npm run test:e2e     # Playwright browser workflows
npm run build        # production builds
npm run lint         # project type-based lint check
```

Install the Playwright Chromium browser once:

```bash
npx playwright install chromium
```

## API Areas

```text
/api/auth             registration, login, logout, session
/api/boards           HLD persistence and lifecycle
/api/lld-boards       LLD persistence and lifecycle
/api/shares           sharing, roles, revocation, collaborator access
/api/versions         activity history and restore
/api/ai               HLD and LLD analysis
/api/architecture     deterministic cleanup
/api/health           service health
```

## Deployment

### Backend on Render

```text
Build: npm ci --include=dev && npm run build -w backend
Start: npm run start -w backend
Health check: /api/health
```

Required production variables:

```env
NODE_ENV=production
NODE_VERSION=22.19.0
MONGO_URI=<ArchFlow_Prod connection string>
WEB_ORIGIN=https://archflow-self.vercel.app
AUTH_SECRET=<production secret>
GROQ_API_KEY=<production Groq key>
GROQ_MODEL=openai/gpt-oss-20b
```

### Frontend on Vercel

```text
Root directory: frontend
Framework: Vite
Build: npm run build
Output: dist
Install: npm ci --include=dev --prefix=..
```

Production variable:

```env
VITE_API_URL=https://archflow-api-jyqq.onrender.com
```

## Design Decisions

- React Flow matches the graph structure of architecture and UML diagrams better than a freehand canvas.
- Guest-first access keeps the editor immediately usable while protecting persistence and ownership operations.
- REST handles durable board lifecycle operations; Socket.IO handles low-latency collaborative graph updates.
- MongoDB remains authoritative while Redis is an optional scaling layer.
- AI suggestions return structured actions and are validated before changing the board.
- The frontend and backend keep aligned TypeScript contracts without introducing a shared package before the repository needs one.

## Security Notes

- Never commit `.env` files, MongoDB credentials, Groq keys, or `AUTH_SECRET`.
- Use separate development and production MongoDB databases.
- Rotate any credential that has been shared outside the deployment platform.
- Authentication uses HTTP-only secure cookies in production.

## Current Scope

ArchFlow is a working architecture design and collaboration product. The next major product addition is an email-based forgot-password flow; the current focus is stable board design, collaboration, and deployment.
