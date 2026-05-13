// WorkerPool class for managing multiple workers
import { Worker, WorkerState } from './worker';
import { RequestMap, EventQueue } from './queue';

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
      idleWorker.processMessage(entry).catch(err => {
        console.error(`Worker ${idleWorker.getId()} error processing message:`, err);
      });
    }
  }

  getState_Full(): WorkerState[] {
    return Array.from(this.workers.values()).map(worker => worker.getState_Full());
  }
}