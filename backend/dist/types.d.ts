export interface Message {
    jobId: string;
    messageText: string;
}
export interface EventRequestEntry {
    uuid: string;
    jobId: string;
    messageText: string;
    status: 'NEW' | 'PROCESSING' | 'COMPLETED';
    createdAt: number;
}
export interface QueueEntry {
    uuid: string;
    jobId: string;
    messageText: string;
}
export interface WorkerState {
    id: number;
    status: 'IDLE' | 'PROCESSING';
    currentMessage?: QueueEntry;
    queue: QueueEntry[];
    requestMapUuid?: string;
}
export interface EventQueueState {
    paused: boolean;
    entries: QueueEntry[];
    workers: Map<number, WorkerState>;
}
//# sourceMappingURL=types.d.ts.map