# ArchFlow

An architecture whiteboard with a React frontend and a Node.js/MongoDB backend.

## Structure

```txt
frontend/   React + TypeScript whiteboard UI
backend/    Node.js + Express + MongoDB API
```

## Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
```

## Environment

Create `backend/.env` locally:

```env
PORT=4000
WEB_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/ArchFlow
```
