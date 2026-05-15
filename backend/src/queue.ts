import { v4 as uuidv4 } from 'uuid';
import { Message, EventRequestEntry, QueueEntry } from './types';

export class RequestMap {
  private entries: Map<string, EventRequestEntry> = new Map();

  addRequest(message: Message): string {
    const uuid = uuidv4();
    const entry: EventRequestEntry = {
      uuid,
      jobId: message.jobId,
      messageText: message.messageText,
      hasInputChanged: message.hasInputChanged ?? true,
      isProcessingRequest: message.isProcessingRequest ?? false,
      status: 'NEW',
      createdAt: Date.now()
    };
    this.entries.set(uuid, entry);
    return uuid;
  }

  addRequestWithUuid(uuid: string, message: Message): void {
    const entry: EventRequestEntry = {
      uuid,
      jobId: message.jobId,
      messageText: message.messageText,
      hasInputChanged: message.hasInputChanged ?? true,
      isProcessingRequest: message.isProcessingRequest ?? false,
      status: 'NEW',
      createdAt: Date.now()
    };
    this.entries.set(uuid, entry);
  }

  updateStatus(uuid: string, status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED', waitingOn?: string): EventRequestEntry{
    const entry = this.entries.get(uuid);
    if (entry) {
      entry.status = status;
      entry.waitingOn = waitingOn;
    }
    return entry!;
  }

  getAll(): EventRequestEntry[] {
    return Array.from(this.entries.values());
  }

  getMatchingJobId(jobId: string): EventRequestEntry[] {
    const matchingJobs: EventRequestEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.jobId === jobId) {
        matchingJobs.push(entry);
      }
    }
    return matchingJobs;
  }
  
  getActiveJobsMatchingJobId(jobId: string): EventRequestEntry[] {
    const matchingActiveJobs: EventRequestEntry[] = [];
    for (const entry of this.getMatchingJobId(jobId)) {
      if ( entry.status === 'PROCESSING' || entry.status === 'WAITING' || entry.status === 'CANCELLING') {
        matchingActiveJobs.push(entry);
      }
    }
    return matchingActiveJobs;
  }

  getNonMatchingActiveJobIds(jobId: string, uuid: string): EventRequestEntry[] {
    const matchingJobs: EventRequestEntry[] = [];
    for (const entry of this.getActiveJobsMatchingJobId(jobId)) {
      if (entry.uuid !== uuid ) {
        matchingJobs.push(entry);
      }
    }
    return matchingJobs;
  }

  removeEntryByUUID(uuid: string): void {
    this.entries.delete(uuid);
  }

  get(uuid: string): EventRequestEntry | undefined {
    return this.entries.get(uuid);
  }

  clear(): void {
    this.entries.clear();
  }
}

export class EventQueue {
  private queue: QueueEntry[] = [];

  enqueue( message: Message): string {
    const uuid = uuidv4();
    const entry: QueueEntry = {
      uuid,
      jobId: message.jobId,
      messageText: message.messageText,
      hasInputChanged: message.hasInputChanged ?? true,
      isProcessingRequest: message.isProcessingRequest ?? false
    };
    this.queue.push(entry);
    return uuid;
  }

  dequeue(): QueueEntry | undefined {
    return this.queue.shift();
  }

  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }
}
