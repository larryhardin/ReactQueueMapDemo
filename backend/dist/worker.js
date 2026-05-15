"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = exports.Worker = void 0;
class Worker {
    id;
    state = 'IDLE';
    queue = [];
    requestMapUuid;
    requestMap;
    eventQueue;
    onStateChange;
    isPausedCallback;
    constructor(id, requestMap, eventQueue, onStateChange, isPausedCallback) {
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
    async processMessage(queueItem) {
        console.log(`Worker ${this.id} started processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
        //Update the worker to processing.
        this.state = 'PROCESSING';
        //Copy the entry to the worker's queue for tracking.
        this.queue.push(queueItem);
        //Search the request map for matching jobids but not matching this queueItem.uuid. 
        this.requestMap.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
        const requestMapEntry = this.requestMap.get(queueItem.uuid);
        // //Notify of state change so UI can update.
        // this.onStateChange(this.id);
        // if ( queueItem.hasInputChanged ) {
        //   console.log(`Worker ${this.id} simulation input has changed for request with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}` );
        // } else {
        //   console.log(`Worker ${this.id} simulation input has not changed for request with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}` );
        // }
        // if ( queueItem.isProcessingRequest ) {              
        //   console.log(`Worker ${this.id} simulation is already processing for request with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}` );
        // } else {
        //   console.log(`Worker ${this.id} simulation request has been started for request with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}` );
        //   this.requestMap.updateStatus(requestMapEntry!.uuid, 'PROCESSING');
        // }
        //Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 15000)); // Default to 5 seconds if timeToWait is not set
        //After processing, update the request map status to completed.
        this.requestMap.updateStatus(queueItem.uuid, 'COMPLETED');
        console.log(`Worker ${this.id} completed processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
        //Clear the worker's queue and update state to idle.
        this.queue = [];
        this.state = 'IDLE';
        //Notify of state change so UI can update.
        this.onStateChange(this.id);
        //get the next message from the event queue and process if available and not paused.
        this.processNextIfAvailable();
    }
    processNextIfAvailable() {
        if (this.isPausedCallback() || this.eventQueue.isEmpty()) {
            return;
        }
        const nextEntry = this.eventQueue.dequeue();
        if (nextEntry) {
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
    workers = new Map();
    concurrency;
    requestMap;
    eventQueue;
    onStateChange;
    isPausedCallback;
    constructor(concurrency, requestMap, eventQueue, onStateChange, isPausedCallback) {
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