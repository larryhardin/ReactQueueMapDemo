import { EventQueue } from './queue';
import { RequestMap } from './queue';
import { WorkerPool } from './workerpool';
import { Message } from './types';
export declare class EventHandler {
    private readonly eventQueue;
    private readonly requestMap;
    private readonly workerPool;
    private queuePaused;
    constructor(eventQueue: EventQueue, requestMap: RequestMap, workerPool: WorkerPool);
    private getTimeoutPromise;
    private getPollingPromise;
    handleIncomingMessage(message: Message): Promise<void>;
}
//# sourceMappingURL=EventHandler.d.ts.map