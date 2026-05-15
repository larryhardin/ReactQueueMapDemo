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
    determineRequestMapEntryState(queueItem) {
        const hasInputChanged = queueItem.hasInputChanged ?? false;
        const isJobIDAlreadyBeingProcessed = this.getIsJobIDAlreadyBeingProcessed(queueItem);
        let requestState = 'NEW';
        if (hasInputChanged) {
            if (isJobIDAlreadyBeingProcessed) {
                requestState = 'WAITING';
            }
            else {
                requestState = 'PROCESSING';
            }
        }
        if (!hasInputChanged) {
            if (isJobIDAlreadyBeingProcessed) {
                requestState = 'WAITING';
            }
            else {
                requestState = 'PROCESSING';
            }
        }
        return requestState;
    }
    getJobToWaitFor(queueItem) {
        const matchingJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
        if (matchingJobs.length > 0) {
            //return the first matching jobId for now
            return matchingJobs[0].uuid;
        }
        return undefined;
    }
    async processMessage(queueItem) {
        console.log(`Worker ${this.id} started processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
        //Update the worker to processing.
        this.state = 'PROCESSING';
        //Copy the entry to the worker's queue for tracking.
        this.queue.push(queueItem);
        //Determine the state for the requestMapEntry:
        const requestMapEntryState = this.determineRequestMapEntryState(queueItem);
        //Update the request map with the determined state:
        if (requestMapEntryState === 'WAITING') {
            const waitingOn = this.getJobToWaitFor(queueItem);
            this.requestMap.updateStatus(queueItem.uuid, requestMapEntryState, waitingOn);
            this.logStateMessages(queueItem);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        else {
            this.requestMap.updateStatus(queueItem.uuid, requestMapEntryState);
            this.logStateMessages(queueItem);
            //wait at least 15 seconds before processing the next message to simulate processing time and allow for potential input changes or cancellations.
            //also allows for polling intervals to elapse.
            //display current time with seconds:
            let currentTime = new Date().toLocaleTimeString();
            //console.log(`Worker ${this.id}  start time is: ${currentTime}. jobID: ${queueItem.jobId} message: ${queueItem.messageText}`);
            //console.log(`Worker ${this.id} is simulating processing for request with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId} for at least 15 seconds. Current time: ${currentTime}`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            currentTime = new Date().toLocaleTimeString();
            //console.log(`Worker ${this.id}  end time is: ${currentTime}. jobID: ${queueItem.jobId} message: ${queueItem.messageText}`);    
            //After processing, update the request map status to completed.
            this.requestMap.updateStatus(queueItem.uuid, 'COMPLETED');
            console.log(`Worker ${this.id} completed processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
        }
        //Clear the worker's queue and update state to idle.
        this.queue = [];
        this.state = 'IDLE';
        //Notify of state change so UI can update.
        this.onStateChange(this.id);
        //get the next message from the event queue and process if available and not paused.
        this.processNextIfAvailable();
    }
    getNonMatchingActiveJobIds(jobId, uuid) {
        return this.requestMap.getNonMatchingActiveJobIds(jobId, uuid);
    }
    getIsJobIDAlreadyBeingProcessed(queueItem) {
        //Search the request map for matching jobids but not matching this queueItem.uuid. 
        const matchingJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
        console.log(`Worker ${this.id} found ${matchingJobs.length} other active job(s) with jobId: ${queueItem.jobId} that do not match uuid: ${queueItem.uuid}`);
        return matchingJobs.length > 0;
    }
    getHasInputChanged(queueItem) {
        return queueItem.hasInputChanged ?? false;
    }
    logStateMessages(queueItem) {
        //Search the request map for matching jobids but not matching this queueItem.uuid. 
        const isJobIDAlreadyBeingProcessed = this.getIsJobIDAlreadyBeingProcessed(queueItem);
        const hasInputChanged = this.getHasInputChanged(queueItem);
        const requestMapEntry = this.requestMap.get(queueItem.uuid);
        const otherActiveJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
        if (hasInputChanged) {
            console.log(`Input has changed for the quote named  ${queueItem.jobId}`);
        }
        else {
            console.log(`No input has changed for the quote named ${queueItem.jobId}`);
        }
        if (isJobIDAlreadyBeingProcessed) {
            console.log(`Simulation is already is already running in the background ${queueItem.jobId}`);
        }
        else {
            console.log(`There is no simulation request for quote ${queueItem.jobId} already running`);
        }
        //Scenario 1 & Scenario 4.
        if (hasInputChanged && !isJobIDAlreadyBeingProcessed) {
            console.log(`the simulation request has been started for quote named ${queueItem.jobId}`);
        }
        //Scenario 2
        if (!hasInputChanged && isJobIDAlreadyBeingProcessed) {
            //add a message that the jobid is waiting on the following active jobs:
            if (otherActiveJobs.length > 0) {
                console.log(`The request with jobId: ${queueItem.jobId} and uuid: ${queueItem.uuid} is waiting on the following active job(s)`);
                console.log(` with the same jobId: `);
                for (const job of otherActiveJobs) {
                    console.log(`uuid: ${job.uuid}, message: ${job.messageText}`);
                }
            }
        }
        //Scenario 3
        if (!hasInputChanged && !isJobIDAlreadyBeingProcessed) {
            console.log(`need to respond with a 200 OK`);
        }
        //Scenario 5
        if (hasInputChanged && isJobIDAlreadyBeingProcessed) {
            if (otherActiveJobs.length > 0) {
                console.log(`The request with jobId: ${queueItem.jobId} and uuid: ${queueItem.uuid} is waiting on the following active job(s)`);
                console.log(`With the same jobId: `);
                for (const job of otherActiveJobs) {
                    console.log(`uuid: ${job.uuid}, message: ${job.messageText}`);
                }
                console.log(`the simulation request should be restarted for quote named ${queueItem.jobId}`);
            }
        }
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