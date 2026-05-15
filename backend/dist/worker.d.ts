import { WorkerState, QueueEntry } from './types';
import { RequestMap, EventQueue } from './queue';
export { WorkerState };
export declare class Worker {
    private readonly id;
    private state;
    private queue;
    private requestMapUuid?;
    private readonly requestMap;
    private readonly eventQueue;
    private readonly onStateChange;
    private readonly isPausedCallback;
    constructor(id: number, requestMap: RequestMap, eventQueue: EventQueue, onStateChange: (workerId: number) => void, isPausedCallback: () => boolean);
    getId(): number;
    getState(): 'IDLE' | 'PROCESSING';
    getQueue(): QueueEntry[];
    isIdle(): boolean;
    private determineRequestMapEntryState;
    private getJobToWaitFor;
    processMessage(queueItem: QueueEntry): Promise<void>;
    private getNonMatchingActiveJobIds;
    private getIsJobIDAlreadyBeingProcessed;
    private getHasInputChanged;
    private logStateMessages;
    private processNextIfAvailable;
    getState_Full(): WorkerState;
}
export declare class WorkerPool {
    private workers;
    private concurrency;
    private requestMap;
    private eventQueue;
    private onStateChange;
    private isPausedCallback;
    constructor(concurrency: number, requestMap: RequestMap, eventQueue: EventQueue, onStateChange: (workerId: number) => void, isPausedCallback: () => boolean);
    getWorkers(): Map<number, Worker>;
    getIdleWorker(): Worker | undefined;
    processNextMessage(paused: boolean): void;
}
//# sourceMappingURL=worker.d.ts.map