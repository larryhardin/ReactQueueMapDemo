# GitHub Copilot Instructions

This project is a full-stack Single Page Application with Node.js/TypeScript backend and React frontend.

## Project Overview

- **Backend**: Express server on port 2112 with event queue and worker pool management
- **Frontend**: React SPA with two-panel layout (message input and event listener)
- **Language**: TypeScript throughout
- **Build Tools**: Vite (frontend), TypeScript compiler (backend)

## Key Features to Remember

1. **Message Input** (Left Panel):
   - JobId: max 18 characters
   - Message: max 50 characters
   - Validation on both client and server

2. **Event Queue**:
   - FIFO ordering
   - Paused on startup
   - Supports pagination (25 items per page)
   - Configurable workers via QUEUE_CONCURRENCY env var

3. **Worker Processing**:
   - 30-second async cycle
   - 4 interval polls at 7.5-second intervals
   - Status tracking: NEW → PROCESSING → COMPLETED
   - Request Map with UUID tracking

## Development Commands

- `npm run dev` - Start both backend and frontend
- `npm run build` - Build both
- `npm run dev:backend` - Backend development server
- `npm run dev:frontend` - Frontend development server

## File Structure Reference

- Backend source: `/backend/src/`
  - `index.ts` - Express server entry point
  - `types.ts` - Type definitions
  - `queue.ts` - Queue and RequestMap classes
  - `worker.ts` - Worker and WorkerPool classes

- Frontend source: `/frontend/src/`
  - `App.tsx` - Main component
  - `App.css` - Global styling
  - `components/` - React components
    - `LeftPanel.tsx` - Message input and history
    - `RightPanel.tsx` - Event listener dashboard
    - `RequestMapDisplay.tsx` - Request tracking
    - `EventQueueDisplay.tsx` - Queue display
    - `WorkerQueuesDisplay.tsx` - Worker queues

## Environment Variables

Backend `.env`:
```
PORT=2112
QUEUE_CONCURRENCY=2
NODE_ENV=development
```

## API Endpoints

See README.md for complete API documentation.
