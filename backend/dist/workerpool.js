"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
// WorkerPool class for managing multiple workers
const worker_1 = require("./worker");
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
            this.workers.set(i, new worker_1.Worker(i, requestMap, eventQueue, onStateChange, isPausedCallback));
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
            idleWorker.processMessage(entry).catch(err => {
                console.error(`Worker ${idleWorker.getId()} error processing message:`, err);
            });
        }
    }
    getState_Full() {
        return Array.from(this.workers.values()).map(worker => worker.getState_Full());
    }
}
exports.WorkerPool = WorkerPool;
//# sourceMappingURL=workerpool.js.map