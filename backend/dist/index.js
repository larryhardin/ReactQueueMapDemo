"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const queue_1 = require("./queue");
const workerpool_1 = require("./workerpool");
const EventHandler_1 = require("./EventHandler");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '2112', 10);
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '2', 10) || 2;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize request map and event queue
const requestMap = new queue_1.RequestMap();
const eventQueue = new queue_1.EventQueue();
// Create worker pool
let queuePaused = true; // Start paused
const onWorkerStateChange = () => {
    // This will be called whenever a worker's state changes
    // The UI will poll for state updates
};
const isPausedCallback = () => queuePaused;
const workerPool = new workerpool_1.WorkerPool(QUEUE_CONCURRENCY, requestMap, eventQueue, onWorkerStateChange, isPausedCallback);
// Routes
// Send message from left side
app.post('/api/message', (req, res) => {
    const { jobId, messageText, hasInputChanged, isProcessingRequest, timeToWait } = req.body;
    const message = {
        jobId,
        messageText,
        hasInputChanged: hasInputChanged ?? true,
        isProcessingRequest: isProcessingRequest ?? false,
        timeToWait: timeToWait // Placeholder, can be updated with actual processing time if needed
    };
    const eventHandler = new EventHandler_1.EventHandler(eventQueue, requestMap, workerPool);
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
app.get('/api/request-map', (req, res) => {
    const entries = requestMap.getAll();
    res.json(entries);
});
// Get event queue entries
app.get('/api/event-queue', (req, res) => {
    const entries = eventQueue.getAll();
    res.json(entries);
});
// Get worker states
app.get('/api/workers', (req, res) => {
    res.json(workerPool.getState_Full());
});
// Pause event queue
app.post('/api/queue/pause', (req, res) => {
    queuePaused = true;
    res.json({ success: true, message: 'Queue paused' });
});
// Play/Resume event queue
app.post('/api/queue/play', (req, res) => {
    queuePaused = false;
    // Process any pending messages
    for (let i = 0; i < QUEUE_CONCURRENCY; i++) {
        workerPool.processNextMessage(queuePaused);
    }
    res.json({ success: true, message: 'Queue resumed' });
});
// Get queue status
app.get('/api/queue/status', (req, res) => {
    res.json({ paused: queuePaused, concurrency: QUEUE_CONCURRENCY });
});
// Clear all data (for testing)
app.post('/api/clear', (req, res) => {
    requestMap.clear();
    eventQueue.clear();
    res.json({ success: true, message: 'All data cleared' });
});
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start server
app.listen(PORT, () => {
    console.log(`Event listener running on http://localhost:${PORT}`);
    console.log(`Queue concurrency: ${QUEUE_CONCURRENCY}`);
    console.log(`Initial queue state: ${queuePaused ? 'PAUSED' : 'RUNNING'}`);
});
//# sourceMappingURL=index.js.map