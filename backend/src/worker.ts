import { WorkerState, QueueEntry } from './types';
import { RequestMap, EventQueue } from './queue';

// Re-export WorkerState for use in workerpool.ts
export { WorkerState };

export class Worker {
  private id: number;
  private state: 'IDLE' | 'PROCESSING' = 'IDLE';
  private queue: QueueEntry[] = [];
  private requestMapUuid?: string;
  private requestMap: RequestMap;
  private eventQueue: EventQueue;
  private onStateChange: (workerId: number) => void;
  private isPausedCallback: () => boolean;

  constructor(
    id: number,
    requestMap: RequestMap,
    eventQueue: EventQueue,
    onStateChange: (workerId: number) => void,
    isPausedCallback: () => boolean
  ) {
    this.id = id;
    this.requestMap = requestMap;
    this.eventQueue = eventQueue;
    this.onStateChange = onStateChange;
    this.isPausedCallback = isPausedCallback;
  }

  getId(): number {
    return this.id;
  }

  getState(): 'IDLE' | 'PROCESSING' {
    return this.state;
  }

  getQueue(): QueueEntry[] {
    return [...this.queue];
  }

  isIdle(): boolean {
    return this.state === 'IDLE';
  }

  async processMessage(entry: QueueEntry): Promise<void> {
    this.state = 'PROCESSING';
    this.requestMapUuid = entry.uuid;
    this.queue.push(entry);
    // Add to request map when worker starts processing with the existing UUID
    this.requestMap.addRequestWithUuid(entry.uuid, { 
      jobId: entry.jobId, 
      messageText: entry.messageText,
      hasInputChanged: entry.hasInputChanged ?? true,
      isProcessingRequest: entry.isProcessingRequest ?? false
    });
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

      if (entry.hasInputChanged) {
        console.log(`Worker ${this.id} detected input change for message ${entry.uuid}`);
        //Check to see if an entry exists in the request map with the same job id but different uuid, which would indicate that the input has changed since this worker started processing. If so, we can break out of the loop early since we know the input has changed and we don't need to keep polling.
        if (entry2) {
          console.log(`Worker ${this.id} found updated entry in request map with same job id:`, entry2);       
          //update the requestMap for the entry2 object's status to be cancelling:
          this.requestMap.updateStatus(entry2, 'CANCELLING');     
          this.onStateChange(this.id);     
        }
      }

      //if (entry && entry.status === 'PROCESSING') {
      if (entry2 ) {
        console.log('=============================================================');
        console.log(`Worker ${this.id} polling request map:`, entry2);
        console.log('=============================================================');      
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

  private processNextIfAvailable(): void {
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

  getState_Full(): WorkerState {
    return {
      id: this.id,
      status: this.state,
      currentMessage: this.queue.length > 0 ? this.queue[this.queue.length - 1] : undefined,
      queue: [...this.queue],
      requestMapUuid: this.requestMapUuid
    };
  }
}

export class WorkerPool {
  private workers: Map<number, Worker> = new Map();
  private concurrency: number;
  private requestMap: RequestMap;
  private eventQueue: EventQueue;
  private onStateChange: (workerId: number) => void;
  private isPausedCallback: () => boolean;

  constructor(
    concurrency: number,
    requestMap: RequestMap,
    eventQueue: EventQueue,
    onStateChange: (workerId: number) => void,
    isPausedCallback: () => boolean
  ) {
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

  getWorkers(): Map<number, Worker> {
    return this.workers;
  }

  getIdleWorker(): Worker | undefined {
    for (const [, worker] of this.workers) {
      if (worker.isIdle()) {
        return worker;
      }
    }
    return undefined;
  }

  processNextMessage(paused: boolean): void {
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
