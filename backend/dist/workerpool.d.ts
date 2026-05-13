import { Worker, WorkerState } from './worker';
import { RequestMap, EventQueue } from './queue';
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
    getState_Full(): WorkerState[];
}
//# sourceMappingURL=workerpool.d.ts.map