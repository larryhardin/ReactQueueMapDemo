import { Message, EventRequestEntry, QueueEntry } from './types';
export declare class RequestMap {
    private entries;
    addRequest(message: Message): string;
    addRequestWithUuid(uuid: string, message: Message): void;
    updateStatus(uuid: string, status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE'): void;
    getAll(): EventRequestEntry[];
    getJobId(jobId: string): string | undefined;
    get(uuid: string): EventRequestEntry | undefined;
    clear(): void;
}
export declare class EventQueue {
    private queue;
    enqueue(uuid: string, message: Message): void;
    dequeue(): QueueEntry | undefined;
    getAll(): QueueEntry[];
    isEmpty(): boolean;
    clear(): void;
}
//# sourceMappingURL=queue.d.ts.map