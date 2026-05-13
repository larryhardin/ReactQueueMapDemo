// Types for the application
export interface Message {
  jobId: string; // 18 characters max
  messageText: string; // 50 characters max
  hasInputChanged: boolean; // Tracks whether input has changed since last send
  isProcessingRequest: boolean; // Tracks whether request is being processed
}

export interface EventRequestEntry {
  uuid: string;
  jobId: string;
  messageText: string;
  hasInputChanged: boolean;
  isProcessingRequest: boolean;
  status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED';
  createdAt: number;
  waitingOn?: string; // uuid of the request this entry is waiting on, if applicable
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
