export interface Message {
    jobId: string;
    messageText: string;
    hasInputChanged: boolean;
    isProcessingRequest: boolean;
    timeToWait: number;
}
export interface EventRequestEntry {
    uuid: string;
    jobId: string;
    messageText: string;
    hasInputChanged: boolean;
    isProcessingRequest: boolean;
    status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED';
    createdAt: number;
    waitingOn?: string;
}
export interface QueueEntry {
    uuid: string;
    jobId: string;
    messageText: string;
    hasInputChanged?: boolean;
    isProcessingRequest?: boolean;
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