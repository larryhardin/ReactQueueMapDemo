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

  //modify this to return an array of matching entries instead of just one, since there could be multiple entries with the same jobId
  getJobId(jobId: string): EventRequestEntry[] {
    const matchingJobs: EventRequestEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.jobId === jobId) {
        matchingJobs.push(entry);
      }
    }
    return matchingJobs;
  }
  
  getActiveJobIds(jobId: string): EventRequestEntry[] {
    const matchingJobs: EventRequestEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.jobId === jobId && ( entry.status === 'PROCESSING' || entry.status === 'WAITING' || entry.status === 'CANCELLING')) {
        matchingJobs.push(entry);
      }
    }
    return matchingJobs;
  }

  getNonMatchingActiveJobIds(jobId: string, uuid: string): EventRequestEntry[] {
    const matchingJobs: EventRequestEntry[] = [];
    for (const entry of this.getActiveJobIds(jobId)) {
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

  enqueue(uuid: string, message: Message): void {
    const entry: QueueEntry = {
      uuid,
      jobId: message.jobId,
      messageText: message.messageText,
      hasInputChanged: message.hasInputChanged ?? true,
      isProcessingRequest: message.isProcessingRequest ?? false
    };
    this.queue.push(entry);
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
