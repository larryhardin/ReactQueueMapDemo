import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Message, EventRequestEntry } from './types';
import { RequestMap, EventQueue } from './queue';
import { WorkerPool } from './workerpool';
import { EventHandler } from './EventHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '2112', 10);
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '2', 10) || 2;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize request map and event queue
const requestMap = new RequestMap();
const eventQueue = new EventQueue();

// Create worker pool
let queuePaused = true; // Start paused

const onWorkerStateChange = () => {
  // This will be called whenever a worker's state changes
  // The UI will poll for state updates
};

const isPausedCallback = () => queuePaused;

const workerPool = new WorkerPool(QUEUE_CONCURRENCY, requestMap, eventQueue, onWorkerStateChange, isPausedCallback);

// Routes

// Send message from left side
app.post('/api/message', (req: Request, res: Response) => {
  const { jobId, messageText, hasInputChanged, isProcessingRequest, timeToWait }: Message = req.body;

  const message: Message = {
    jobId,
    messageText,
    hasInputChanged: hasInputChanged ?? true,
    isProcessingRequest: isProcessingRequest ?? false,
    timeToWait: timeToWait // Placeholder, can be updated with actual processing time if needed
  };
  const eventHandler = new EventHandler(eventQueue, requestMap, workerPool);

  const handleMessagePromise = eventHandler.handleIncomingMessage(message);

  // Try to process the newly enqueued message if the queue is running.
  if (!queuePaused) {
    workerPool.processNextMessage(queuePaused);
  }

  //the handleIncomingMessage needs to return the result status
  handleMessagePromise
    .then(() => {
      res.status(200).json({ message: 'Message received and processed' });
    })
    .catch((error) => {
      console.error('Error handling incoming message:', error);
      res.status(500).json({ error: 'Internal server error' });
    });

});

// Get request map entries
app.get('/api/request-map', (req: Request, res: Response) => {
  const entries = requestMap.getAll();
  res.json(entries);
});

// Get event queue entries
app.get('/api/event-queue', (req: Request, res: Response) => {
  const entries = eventQueue.getAll();
  res.json(entries);
});

// Get worker states
app.get('/api/workers', (req: Request, res: Response) => {
  res.json(workerPool.getState_Full());
});

// Pause event queue
app.post('/api/queue/pause', (req: Request, res: Response) => {
  queuePaused = true;
  res.json({ success: true, message: 'Queue paused' });
});

// Play/Resume event queue
app.post('/api/queue/play', (req: Request, res: Response) => {
  queuePaused = false;

  // Process any pending messages
  for (let i = 0; i < QUEUE_CONCURRENCY; i++) {
    workerPool.processNextMessage(queuePaused);
  }

  res.json({ success: true, message: 'Queue resumed' });
});

// Get queue status
app.get('/api/queue/status', (req: Request, res: Response) => {
  res.json({ paused: queuePaused, concurrency: QUEUE_CONCURRENCY });
});

// Clear all data (for testing)
app.post('/api/clear', (req: Request, res: Response) => {
  requestMap.clear();
  eventQueue.clear();
  res.json({ success: true, message: 'All data cleared' });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Event listener running on http://localhost:${PORT}`);
  console.log(`Queue concurrency: ${QUEUE_CONCURRENCY}`);
  console.log(`Initial queue state: ${queuePaused ? 'PAUSED' : 'RUNNING'}`);
});
