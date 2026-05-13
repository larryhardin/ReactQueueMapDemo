"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = exports.Worker = void 0;
class Worker {
    constructor(id, requestMap, eventQueue, onStateChange, isPausedCallback) {
        this.state = 'IDLE';
        this.queue = [];
        this.id = id;
        this.requestMap = requestMap;
        this.eventQueue = eventQueue;
        this.onStateChange = onStateChange;
        this.isPausedCallback = isPausedCallback;
    }
    getId() {
        return this.id;
    }
    getState() {
        return this.state;
    }
    getQueue() {
        return [...this.queue];
    }
    isIdle() {
        return this.state === 'IDLE';
    }
    async processMessage(entry) {
        this.state = 'PROCESSING';
        this.requestMapUuid = entry.uuid;
        this.queue.push(entry);
        // Add to request map when worker starts processing with the existing UUID
        this.requestMap.addRequestWithUuid(entry.uuid, { jobId: entry.jobId, messageText: entry.messageText });
        this.requestMap.updateStatus(entry.uuid, 'PROCESSING');
        this.onStateChange(this.id);
        console.log(`Worker ${this.id} started processing message:`, entry);
        // Wait 30 seconds with 4 interval polls
        const pollInterval = 7500; // 30000 / 4 = 7500ms
        const pollCount = 4;
        for (let i = 0; i < pollCount; i++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            // Poll request map for matching job id
            //const entry = this.requestMap.get(this.requestMapUuid!);
            console.log('Searching requestMap for jobId:', entry.jobId);
            const entry2 = this.requestMap.getJobId(entry.jobId);
            console.log('Polled requestMap entry:', entry2);
            //if (entry && entry.status === 'PROCESSING') {
            if (entry2) {
                console.log('=============================================================');
                console.log(`Worker ${this.id} polling request map:`, entry2);
                console.log('=============================================================');
                this.onStateChange(this.id);
                //how do I signal the frontend to update the display? I guess I can just call onStateChange with the worker id, 
                // and then the frontend can fetch the worker state again?  
                //where in frontend code do I need to add the fetch for worker state? I guess I can add it in the WorkerQueuesDisplay component, and then when onStateChange is called, it can trigger a fetch of the worker states and update the display.
            }
        }
        // After polling complete, set to COMPLETED
        if (this.requestMapUuid) {
            this.requestMap.updateStatus(this.requestMapUuid, 'COMPLETED');
        }
        // Reset worker state
        this.state = 'IDLE';
        this.queue = [];
        this.requestMapUuid = undefined;
        this.onStateChange(this.id);
        // After completing a message, try to process the next one
        this.processNextIfAvailable();
    }
    processNextIfAvailable() {
        // Check if queue is paused or empty
        if (this.isPausedCallback() || this.eventQueue.isEmpty()) {
            return;
        }
        const nextEntry = this.eventQueue.dequeue();
        if (nextEntry) {
            // Process next message asynchronously without awaiting
            this.processMessage(nextEntry).catch(err => {
                console.error(`Worker ${this.id} error processing message:`, err);
            });
        }
    }
    getState_Full() {
        return {
            id: this.id,
            status: this.state,
            currentMessage: this.queue.length > 0 ? this.queue[this.queue.length - 1] : undefined,
            queue: [...this.queue],
            requestMapUuid: this.requestMapUuid
        };
    }
}
exports.Worker = Worker;
class WorkerPool {
    constructor(concurrency, requestMap, eventQueue, onStateChange, isPausedCallback) {
        this.workers = new Map();
        this.concurrency = concurrency;
        this.requestMap = requestMap;
        this.eventQueue = eventQueue;
        this.onStateChange = onStateChange;
        this.isPausedCallback = isPausedCallback;
        // Create workers
        for (let i = 1; i <= concurrency; i++) {
            this.workers.set(i, new Worker(i, requestMap, eventQueue, onStateChange, isPausedCallback));
        }
    }
    getWorkers() {
        return this.workers;
    }
    getIdleWorker() {
        for (const [, worker] of this.workers) {
            if (worker.isIdle()) {
                return worker;
            }
        }
        return undefined;
    }
    processNextMessage(paused) {
        if (paused || this.eventQueue.isEmpty()) {
            return;
        }
        const idleWorker = this.getIdleWorker();
        if (!idleWorker) {
            return;
        }
        const entry = this.eventQueue.dequeue();
        if (entry) {
            // Process asynchronously without awaiting
            idleWorker.processMessage(entry).catch(err => {
                console.error('Error processing message:', err);
            });
        }
    }
}
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=worker.js.map