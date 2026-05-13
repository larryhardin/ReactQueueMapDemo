# Queuing Demo - Single Page Application

A full-stack application demonstrating event queue management with worker pools, built with Node.js/TypeScript backend and React frontend.

## Project Structure

```
├── backend/          # Express server with event queue
│   ├── src/
│   │   ├── types.ts          # TypeScript type definitions
│   │   ├── queue.ts          # Queue and RequestMap classes
│   │   ├── worker.ts         # Worker and WorkerPool classes
│   │   └── index.ts          # Express server setup
│   └── package.json
├── frontend/         # React SPA with Vite
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── App.tsx           # Main app component
│   │   ├── App.css           # Styling
│   │   └── main.tsx          # React entry point
│   └── package.json
└── package.json      # Root package.json for concurrent development
```

## Features

### Left Panel
- **Message Input Form**
  - JobId input (max 18 characters)
  - Message input (max 50 characters)
  - Send button with validation
  - Sent messages history with timestamps

### Right Panel - Event Listener (Port 2112)

1. **Event Request Map** (Paginated - 25 entries per page)
   - Displays UUID, JobId, Message, and Status (NEW/PROCESSING/COMPLETED)
   - Real-time status updates

2. **Event Queue** (FIFO, Paginated - 25 entries per page)
   - Shows pending messages in queue order
   - Displays UUID, JobId, and Message

3. **Queue Controls**
   - Pause button: Stops queue processing
   - Play button: Resumes queue processing
   - Status indicator showing current queue state

4. **Worker Queues** (2 workers by default)
   - Each worker has its own queue display
   - Shows worker status (IDLE/PROCESSING)
   - Displays current processing task

## Backend Details

### Architecture

- **Express Server** (Port 2112)
  - Receives messages from frontend via POST /api/message
  - Manages event queue with FIFO ordering
  - Manages worker pool for message processing
  - Provides real-time state via REST API

- **Worker Pool**
  - Configurable via `QUEUE_CONCURRENCY` env variable (default: 2)
  - Each worker processes one message at a time
  - Workers follow this flow:
    1. Dequeue message from event queue
    2. Set status to PROCESSING
    3. Add entry to request map with UUID
    4. Wait 30 seconds with 4 interval polls (every 7.5 seconds)
    5. Set status to COMPLETED
    6. Return to IDLE state

### Environment Variables

Create a `.env` file in the backend directory:

```
PORT=2112
QUEUE_CONCURRENCY=2
NODE_ENV=development
```

### API Endpoints

- `POST /api/message` - Submit a new message
- `GET /api/request-map` - Get all request entries
- `GET /api/event-queue` - Get queue entries
- `GET /api/workers` - Get worker states
- `POST /api/queue/pause` - Pause queue processing
- `POST /api/queue/play` - Resume queue processing
- `GET /api/queue/status` - Get queue status
- `GET /health` - Health check

## Setup & Installation

### Prerequisites
- Node.js 16+ and npm 8+

### Installation

1. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

   Or install separately:
   ```bash
   # Root
   npm install
   
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Setup environment variables** (Backend):
   ```bash
   cd backend
   cp .env.example .env
   ```

## Development

### Run both services concurrently:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:2112
- Frontend dev server on http://localhost:5173

### Run services individually:

**Backend only**:
```bash
npm run dev:backend
# or from backend folder: npm run dev
```

**Frontend only**:
```bash
npm run dev:frontend
# or from frontend folder: npm run dev
```

## Building

### Build both:
```bash
npm run build
```

### Build separately:
```bash
npm run build:backend    # Creates backend/dist/
npm run build:frontend   # Creates frontend/dist/
```

## Usage

1. Start both services with `npm run dev`
2. Open http://localhost:5173 in your browser
3. **Left Panel**: Enter a JobId and Message, click Send
4. **Right Panel**: 
   - View messages in Event Queue
   - Track requests in Event Request Map
   - Control queue with Pause/Play buttons
   - Monitor worker activity in Queue 1 and Queue 2
5. Click Play to start processing messages
6. Watch workers process messages with 30-second cycle

## Message Format

- **JobId**: Up to 18 characters (alphanumeric, special chars allowed)
- **Message**: Up to 50 characters
- **Example**: JobId: `0Q0QL000003qaTt0AI`, Message: `Simulate message 1`

## Status Flow

1. **NEW**: Message created and added to event queue
2. **PROCESSING**: Worker picked up message and is processing it
3. **COMPLETED**: Processing cycle complete (30 seconds + 4 polls finished)

## Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Communication**: HTTP (REST API with CORS)
- **Styling**: CSS3

## Notes

- Queue starts in **PAUSED** state on startup
- Workers can only process one message at a time
- When queue is paused, no messages are processed
- Pagination supports 25 entries per page for both queues
- Real-time updates via polling (500ms interval)
