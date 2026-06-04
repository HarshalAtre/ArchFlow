# Visual Architecture Whiteboard Implementation Plan

## Goal

Build an interview-ready visual whiteboard application for designing system architecture diagrams. The project should go beyond a basic drawing tool by including automated cleanup, architecture suggestions, rich context attached to diagram elements, and optional real-time collaboration.

The main priority is not only completing features, but building the project with clean structure, low coupling, strong separation of concerns, and system design principles that are easy to explain in interviews.

## Target Timeline

The project is realistic in 10 to 15 days if scoped carefully.

- 10 days: polished single-user MVP with board editing, mass cleanup, context layer, save/load, and rule-based architecture assist.
- 15 days: add real-time collaboration, presence, auth, shareable boards, Redis-backed sync, and stronger UI polish.

## Recommended Stack

### Frontend

- React
- TypeScript
- React Flow for architecture diagrams
- Zustand or Redux Toolkit for board state
- Tailwind CSS or existing design system
- Vite or Next.js depending on project preference

### Backend

- Node.js
- Express or NestJS
- TypeScript
- PostgreSQL or MongoDB
- Socket.io for real-time collaboration
- Redis for presence, event fanout, and temporary board state sync

### Shared Packages

- Shared domain types
- Shared event contracts
- Shared validators
- Shared architecture suggestion models

## Why React Flow Instead Of Raw Fabric.js

React Flow is the better fit because this project focuses on system architecture diagrams rather than freehand drawing.

Advantages:

- Built-in support for nodes and edges
- Easier arrows and connections
- Easier auto-layout for the mass cleanup feature
- Better fit for architecture diagrams
- Cleaner state model
- Easier to explain as graph-based system design tooling

Fabric.js can be considered later if freehand sketching becomes important.

## Monorepo Structure

```txt
visual-arch-board/
  apps/
    web/
    api/

  packages/
    shared/
    board-core/
    architecture-engine/
```

### apps/web

React frontend application.

Responsibilities:

- Render the board UI
- Handle user interaction
- Manage local board state
- Call backend APIs
- Send and receive collaboration events
- Display context and architecture suggestions

### apps/api

Node.js backend application.

Responsibilities:

- Manage board persistence
- Validate board events
- Handle collaboration sessions
- Store context layer data
- Run architecture assist logic
- Expose REST and WebSocket APIs

### packages/shared

Shared contracts used by frontend and backend.

Responsibilities:

- Board element types
- Board event types
- API request and response types
- Architecture suggestion types
- Validation schemas

### packages/board-core

Framework-independent board domain logic.

Responsibilities:

- Board graph operations
- Element creation rules
- Element update rules
- Board serialization
- Board validation
- Conversion between UI state and domain state

### packages/architecture-engine

Architecture analysis and cleanup logic.

Responsibilities:

- Mass cleanup layout algorithms
- Rule-based architecture suggestions
- Detection of missing components
- Scalability and performance recommendations
- Future AI integration boundary

## Frontend Structure

```txt
apps/web/src/
  app/
    providers/
    routes/
    layout/

  features/
    board/
      components/
      hooks/
      services/
      state/

    context-layer/
      components/
      hooks/
      services/
      state/

    architecture-assist/
      components/
      hooks/
      services/

    collaboration/
      services/
      state/
      hooks/

  entities/
    board-element/
    board/
    user/
    context-item/

  shared/
    ui/
    lib/
    api/
    types/
    constants/
```

## Backend Structure

```txt
apps/api/src/
  modules/
    boards/
      board.controller.ts
      board.service.ts
      board.repository.ts
      board.schema.ts

    context/
      context.controller.ts
      context.service.ts
      context.repository.ts
      context.schema.ts

    architecture-assist/
      architecture.controller.ts
      architecture.service.ts
      rules/
        detect-missing-db.ts
        detect-cache-need.ts
        detect-auth-need.ts
        detect-queue-need.ts

    collaboration/
      collaboration.gateway.ts
      presence.service.ts
      board-event.service.ts
      event-bus.ts

    auth/
      auth.controller.ts
      auth.service.ts

  shared/
    database/
    redis/
    config/
    errors/
    logger/
```

## Core Design Principles

### 1. Separation Of Concerns

- React components render UI.
- Hooks coordinate UI behavior.
- Services communicate with APIs.
- State stores manage client state.
- Domain logic lives outside React components.
- Backend controllers handle transport.
- Backend services handle business logic.
- Backend repositories handle database access.

### 2. Low Coupling

The board UI should not directly know how architecture suggestions work.

The architecture engine should receive structured board data and return structured suggestions. It should not depend on React Flow, database models, or WebSocket events.

### 3. High Cohesion

Related logic should stay together.

- Board editing belongs to the board feature.
- Notes, links, snippets, and files belong to the context layer.
- Cleanup and architecture suggestions belong to the architecture engine.
- Realtime sync belongs to the collaboration module.

### 4. Shared Contracts

Frontend and backend should share the same types for important system boundaries.

Example:

```ts
export type BoardElementType =
  | "service"
  | "database"
  | "queue"
  | "cache"
  | "external-api"
  | "load-balancer"
  | "text"
  | "arrow";

export type BoardElement = {
  id: string;
  type: BoardElementType;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  label: string;
  metadata?: Record<string, unknown>;
};
```

### 5. Event-Driven Collaboration

User actions should be represented as clear domain events.

Examples:

```ts
export type BoardEventType =
  | "ELEMENT_CREATED"
  | "ELEMENT_MOVED"
  | "ELEMENT_UPDATED"
  | "ELEMENT_DELETED"
  | "EDGE_CREATED"
  | "CONTEXT_ATTACHED"
  | "BOARD_CLEANED_UP";
```

Benefits:

- Easier WebSocket synchronization
- Easier debugging
- Easier replay and audit history
- Better interview explanation
- Cleaner separation between user actions and persistence

## Main Features

## 1. Visual Whiteboard

Users can create and edit architecture diagrams.

Core functionality:

- Add service nodes
- Add database nodes
- Add cache nodes
- Add queue nodes
- Add external API nodes
- Connect nodes with arrows
- Move and resize nodes
- Edit labels
- Delete elements
- Save board
- Load board

## 2. Mass Clean Up

One-click layout cleanup for messy architecture diagrams.

Input:

- Current board nodes
- Current board edges
- Node types
- Approximate positions

Output:

- Updated node positions
- Cleaner layer-based layout
- Better spacing
- More readable edge flow

Suggested layout layers:

```txt
Clients / External Users
        |
Load Balancer / API Gateway
        |
Services
        |
Databases / Queues / Caches
        |
External APIs
```

Implementation approach:

- Convert board to graph
- Classify nodes by type
- Arrange nodes by architectural layer
- Apply spacing rules
- Return updated positions
- Update board state
- Broadcast cleanup event if collaboration is enabled

## 3. Context Layer

Users can attach rich context to any board element.

Supported context items:

- Notes
- Links
- API endpoint details
- Code snippets
- Database schema notes
- File attachment metadata
- Ownership information
- Deployment notes

Example context model:

```ts
export type ContextItem = {
  id: string;
  boardId: string;
  elementId: string;
  type: "note" | "link" | "code" | "file" | "api" | "schema";
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

## 4. Architecture Assist

Architecture Assist gives suggestions based on the diagram.

MVP should start with rule-based suggestions.

Example rules:

- If many services connect directly to a database, suggest a cache or read replica.
- If user-facing services exist without auth, suggest authentication.
- If service-to-service async work is implied but no queue exists, suggest message queue.
- If multiple client nodes connect directly to services, suggest API gateway or load balancer.
- If external APIs are used heavily, suggest timeout, retry, and circuit breaker policies.
- If database node exists without backup notes, suggest backups and replication.

Example suggestion model:

```ts
export type ArchitectureSuggestion = {
  id: string;
  type: "missing-component" | "scalability" | "performance" | "reliability" | "security";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  relatedElementIds: string[];
  suggestedElementType?: BoardElementType;
};
```

## 5. Real-Time Collaboration

This is a high-value feature, but it should be treated as phase 2 if time is tight.

Core functionality:

- Multiple users can join the same board
- Cursor or presence indicators
- Broadcast element changes
- Broadcast context changes
- Broadcast cleanup events
- Save final board state

Suggested flow:

```txt
User action
  -> Local board event created
  -> Frontend updates optimistically
  -> WebSocket sends event to backend
  -> Backend validates event
  -> Backend persists event or state
  -> Backend broadcasts event to other clients
  -> Other clients apply event
```

Redis usage:

- Store active board sessions
- Track online users
- Fan out events between server instances
- Cache temporary board state

## Data Models

### Board

```ts
export type Board = {
  id: string;
  name: string;
  ownerId: string;
  elements: BoardElement[];
  edges: BoardEdge[];
  createdAt: string;
  updatedAt: string;
};
```

### Board Edge

```ts
export type BoardEdge = {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  label?: string;
  metadata?: Record<string, unknown>;
};
```

### Board Event

```ts
export type BoardEvent = {
  id: string;
  boardId: string;
  userId: string;
  type: BoardEventType;
  payload: Record<string, unknown>;
  createdAt: string;
};
```

## API Design

### Boards

```txt
POST   /api/boards
GET    /api/boards
GET    /api/boards/:boardId
PATCH  /api/boards/:boardId
DELETE /api/boards/:boardId
```

### Board Elements

```txt
POST   /api/boards/:boardId/elements
PATCH  /api/boards/:boardId/elements/:elementId
DELETE /api/boards/:boardId/elements/:elementId
```

### Context Layer

```txt
GET    /api/boards/:boardId/elements/:elementId/context
POST   /api/boards/:boardId/elements/:elementId/context
PATCH  /api/context/:contextId
DELETE /api/context/:contextId
```

### Architecture Assist

```txt
POST /api/architecture/analyze
POST /api/architecture/cleanup
```

### Collaboration

```txt
socket: join-board
socket: leave-board
socket: board-event
socket: presence-updated
socket: board-state-sync
```

## Feature Flow: Mass Clean Up

```txt
User clicks Clean Up
  -> Frontend reads current board graph
  -> Frontend calls architecture cleanup service
  -> architecture-engine calculates layout
  -> Updated node positions are returned
  -> Frontend updates board state
  -> Board is saved
  -> Cleanup event is broadcast to collaborators
```

## Feature Flow: Architecture Assist

```txt
User clicks Analyze
  -> Frontend sends board graph to backend
  -> Backend passes graph to architecture-engine
  -> Rule engine detects missing or weak components
  -> Suggestions are returned
  -> Frontend displays suggestions in side panel
  -> User can apply selected suggestion to the board
```

## Feature Flow: Context Layer

```txt
User selects a board element
  -> Context panel opens
  -> Frontend loads context items for that element
  -> User adds note, link, code, or API details
  -> Backend stores context item
  -> Frontend updates selected element context count
  -> Collaboration event is broadcast if enabled
```

## Suggested 10-Day MVP Plan

### Day 1: Project Setup

- Create monorepo structure
- Set up React frontend
- Set up Node.js backend
- Add TypeScript configuration
- Add shared package
- Define initial board types
- Create basic app shell

### Day 2: Board Editor MVP

- Add React Flow canvas
- Add node creation toolbar
- Add node movement
- Add edge creation
- Add label editing
- Add delete behavior

### Day 3: Board State And Persistence

- Add board state store
- Add board serialization
- Add backend board APIs
- Add database schema
- Implement save board
- Implement load board

### Day 4: Context Layer

- Add selectable elements
- Add right-side context panel
- Add notes and links
- Add code snippet context
- Store context in backend
- Show context indicator on nodes

### Day 5: Mass Clean Up V1

- Create architecture-engine package
- Implement graph conversion
- Implement node classification
- Implement layer-based auto-layout
- Add Clean Up button
- Apply layout changes to board

### Day 6: Architecture Assist V1

- Add architecture analyze endpoint
- Implement rule-based suggestions
- Add suggestions side panel
- Add related element highlighting
- Add apply suggestion action

### Day 7: UI Polish And Demo Flow

- Improve toolbar
- Improve side panels
- Add empty states
- Add loading and error states
- Add board title and save status
- Create a polished sample architecture board

### Day 8: Tests And Reliability

- Unit test board-core logic
- Unit test architecture-engine rules
- Test cleanup algorithm
- Test API service methods
- Fix edge cases

### Day 9: Interview Readiness

- Add README
- Add architecture diagram for the project itself
- Add feature explanation
- Add system design decisions
- Add demo script

### Day 10: Final Polish

- Improve responsiveness
- Fix visual bugs
- Add deployment notes
- Record demo or prepare walkthrough
- Final test pass

## Additional 5-Day Stretch Plan

### Day 11: Authentication

- Add login/signup
- Add user-owned boards
- Add protected routes
- Add basic session handling

### Day 12: Real-Time Collaboration

- Add Socket.io backend gateway
- Add join-board and leave-board events
- Broadcast board events
- Apply remote changes on clients

### Day 13: Redis And Presence

- Add Redis connection
- Track active users per board
- Add presence indicators
- Add cursor or user list
- Support event fanout

### Day 14: Version History

- Store board events
- Add basic undo/redo
- Add board activity timeline
- Add event replay foundation

### Day 15: Deployment And Final Demo

- Deploy frontend
- Deploy backend
- Configure environment variables
- Add production database
- Finalize README and demo narrative

## Interview Talking Points

- The project is modeled as a graph of architecture elements and relationships.
- React Flow is used because architecture diagrams are graph-based, not freehand drawings.
- The architecture engine is framework-independent, so it can be tested separately.
- Shared packages keep frontend and backend contracts consistent.
- Collaboration is event-driven instead of syncing random full state repeatedly.
- Redis is used for presence and real-time fanout, not as the primary database.
- Context layer turns the tool from a whiteboard into an execution workspace.
- Mass cleanup demonstrates algorithmic thinking and user experience improvement.
- Architecture Assist demonstrates system design awareness.

## MVP Success Criteria

The MVP is successful when:

- A user can create an architecture diagram.
- A user can connect components with arrows.
- A user can attach notes, links, or code to any component.
- A user can click Clean Up and see the diagram become organized.
- A user can run Architecture Assist and receive useful suggestions.
- A user can save and reopen a board.
- The codebase has clear module boundaries.
- The project can be explained confidently in an interview.

## Scope Control

Features to avoid in the first 10 days:

- Full Figma-style infinite design tooling
- Complex freehand drawing
- Advanced permissions
- Complex file upload storage
- Perfect multiplayer conflict resolution
- AI integration before rule-based architecture assist works
- Overly complex animations

These can be added later, but the first goal is a polished, well-architected MVP.

