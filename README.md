# ArchFlow - Visual Architecture Whiteboard

An architecture whiteboard built as a TypeScript monorepo.

## Structure

```txt
apps/
  web/                  React frontend
  api/                  Node.js API

packages/
  shared/               Shared contracts and types
  board-core/           Board domain logic
  architecture-engine/  Cleanup and architecture suggestions
```

## Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
```
