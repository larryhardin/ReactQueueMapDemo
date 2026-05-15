import { Message, EventRequestEntry, QueueEntry } from './types';
export declare class RequestMap {
    private entries;
    addRequest(message: Message): string;
    addRequestWithUuid(uuid: string, message: Message): void;
    updateStatus(uuid: string, status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED', waitingOn?: string): EventRequestEntry;
    getAll(): EventRequestEntry[];
    getMatchingJobId(jobId: string): EventRequestEntry[];
    getActiveJobsMatchingJobId(jobId: string): EventRequestEntry[];
    getNonMatchingActiveJobIds(jobId: string, uuid: string): EventRequestEntry[];
    removeEntryByUUID(uuid: string): void;
    get(uuid: string): EventRequestEntry | undefined;
    clear(): void;
}
export declare class EventQueue {
    private queue;
    enqueue(message: Message): string;
    dequeue(): QueueEntry | undefined;
    getAll(): QueueEntry[];
    isEmpty(): boolean;
    clear(): void;
}
//# sourceMappingURL=queue.d.ts.map