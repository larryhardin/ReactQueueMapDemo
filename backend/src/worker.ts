import { WorkerState, QueueEntry } from './types';
import { RequestMap, EventQueue } from './queue';

// Re-export WorkerState for use in workerpool.ts
export { WorkerState };

export class Worker {
  private readonly id: number;
  private state: 'IDLE' | 'PROCESSING' = 'IDLE';
  private queue: QueueEntry[] = [];
  private requestMapUuid?: string;
  private readonly requestMap: RequestMap;
  private readonly eventQueue: EventQueue;
  private readonly onStateChange: (workerId: number) => void;
  private readonly isPausedCallback: () => boolean;

  constructor(
    id: number,
    requestMap: RequestMap,
    eventQueue: EventQueue,
    onStateChange: (workerId: number) => void,
    isPausedCallback: () => boolean
  ) {
    this.id = id;
    this.requestMap = requestMap;
    this.eventQueue = eventQueue;
    this.onStateChange = onStateChange;
    this.isPausedCallback = isPausedCallback;
  }

  getId(): number {
    return this.id;
  }

  getState(): 'IDLE' | 'PROCESSING' {
    return this.state;
  }

  getQueue(): QueueEntry[] {
    return [...this.queue];
  }

  isIdle(): boolean {
    return this.state === 'IDLE';
  }

  async processMessage(entry: QueueEntry): Promise<void> {
    this.state = 'PROCESSING';
    this.requestMapUuid = entry.uuid;
    this.queue.push(entry);

    // Add to request map when worker starts processing with the existing UUID
    this.requestMap.addRequestWithUuid(entry.uuid, {
      jobId: entry.jobId,
      messageText: entry.messageText,
      hasInputChanged: entry.hasInputChanged ?? true,
      isProcessingRequest: entry.isProcessingRequest ?? false
    });

    entry = this.requestMap.updateStatus(entry.uuid, 'NEW');

    //nudge ui to refresh.
    this.onStateChange(this.id);

    console.log(`Worker ${this.id} started processing message:`, entry.uuid);

    // Wait 30 seconds with 4 interval polls
    const pollInterval = 7500; // 30000 / 4 = 7500ms
    const pollCount = 4;

    for (let i = 0; i < pollCount; i++) {

      console.log(`${this.id}==============================================================================================`);
      console.log(`Worker ${this.id} polling interval ${i + 1}/${pollCount} for message ${entry.uuid}`);
      console.log(`${this.id}==============================================================================================`);
      //Note: Having the await at the beggining of the loop means that checks happen at the end of each interval.
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      //Has a request to cancel this job been made since the worker started processing?
      const currentEntry = this.requestMap.get(entry.uuid);

      if (currentEntry?.status === 'CANCELLING') {
        //Entry is being cancelled. Stop processing.
        console.log(`Worker ${this.id} stopping processing of message ${entry.uuid} as it is being cancelled.`);
        this.requestMap.updateStatus(entry.uuid, 'CANCELLED');
        break;
      }

      if (!currentEntry) {
        //Entry has been removed from the request map, likely due to cancellation. Stop processing.
        console.log(`Worker ${this.id} stopping processing of message ${entry.uuid} as it has been removed from the request map.`);
        //As it ain't there, add it back with the cancelled status so that the UI can reflect that it was cancelled.
        this.requestMap.addRequestWithUuid(entry.uuid, {
          jobId: entry.jobId,
          messageText: entry.messageText,
          hasInputChanged: entry.hasInputChanged ?? true,
          isProcessingRequest: entry.isProcessingRequest ?? false
        });
        this.requestMap.updateStatus(entry.uuid, 'CANCELLED');
        console.log(`${this.id}==============================================================================================`);
        console.log('');
        break;
      }


      //if there are and this job's input has changed, then set those to cancelling.
      const entry2 = this.requestMap.getNonMatchingActiveJobIds(entry.jobId, entry.uuid);     

      //the logic around state inspection should be put in its own method or even class as it can get pretty complex 
      //and we want to keep the worker class focused on just processing messages and managing its own state. 
      //For now, I'll just put the logic here but we should refactor it later.

      //Does the current job have changed input?
      if (entry.hasInputChanged) {
        console.log(`Worker ${this.id} simulation input has changed`);
        //Yes, it does, cancel any running jobs.
        if (entry2.length > 0) {
          console.log(`Worker ${this.id} there are ${entry2.length} active entries with the same job id:${entry.jobId}`);
          for (const e of entry2) {
            //if the job is waiting on this job, don't cancel it.
            if (e.status === 'WAITING') {
              if (e.waitingOn === entry.uuid) {
                console.log(`Worker ${this.id} not cancelling entry with uuid:${e.uuid} as it is waiting on the current job`);
                continue;
              } else {
                console.log(`Worker ${this.id} same jobid is waiting on a different job with uuid:${e.waitingOn}, cancelling...`);
                this.requestMap.updateStatus(e.uuid, 'CANCELLING');
                //Set this one as waiting for the job which is being cancelled.
                entry = this.requestMap.updateStatus(entry.uuid, 'WAITING', e.uuid);
              }
            } else {
              console.log(`Worker ${this.id} cancelling entry with uuid:${e.uuid} and status:${e.status}`);
              this.requestMap.updateStatus(e.uuid, 'CANCELLING');
              entry = this.requestMap.updateStatus(entry.uuid, 'WAITING', e.uuid);
            }
          }
          console.log(`Worker ${this.id} request status ${this.requestMap.get(entry.uuid)?.status} `);
          console.log(`Worker ${this.id} simulation request should be restarted for quote named ${entry.jobId}`);
          //console.log(`Worker ${this.id} the current simulation request is being set to WAITING, until the previous cancellations occur.`);
          //will have already been updated to waiting.  
        } else {
          console.log(`Worker ${this.id} there is no simulation for quote named ${entry.jobId} already running`);
          console.log(`Worker ${this.id} the simulation request has been started for quote named ${entry.jobId}`);
          entry = this.requestMap.updateStatus(entry.uuid, 'PROCESSING');
        }
        this.onStateChange(this.id);
      } else {
        //No changes to the input have occurred.         
        console.log(`Worker ${this.id} no input has changed for the quote named ${entry.jobId}`);
        //this is an assumption, but a pretty decent one. could inspect each element that is not the inscope uuid and determine its state.
        if (entry2.length > 0) {
          console.log(`Worker ${this.id} the simulation request is already running in the background:`);
          for (const e of entry2) {
            console.log(`Worker ${this.id} e.uuid ${e.uuid} is also assigned to jobid ${e.jobId}`);
            entry = this.requestMap.updateStatus(entry.uuid, 'WAITING', e.uuid);
          }
        } else {
          //remove entry from queue and return a 200
          console.log(`Worker ${this.id} Scenario: return 200 when nothing has changed`);
          console.log(`Worker ${this.id} current status = ${this.requestMap.get(entry.uuid)?.status} for message ${entry.uuid}`);

          //Set to complete.
          entry = this.requestMap.updateStatus(entry.uuid, 'COMPLETED');
          break; // exit the polling loop
        }
      }
      //next interval.    
      this.onStateChange(this.id);
    }
    // Reset worker state
    this.state = 'IDLE';
    this.queue = [];
    this.requestMapUuid = undefined;
    this.onStateChange(this.id);

    //Next, simulate that the job is still processing after all intervals.
    if (entry.isProcessingRequest && this.requestMap.get(entry.uuid)?.status === 'PROCESSING') {
      console.log(`Worker ${this.id} simulation of long processing job is still running after all intervals have completed for message ${entry.uuid}`);
      //This is simulating the Scenario: wait on async that exceeds sap timeout

      //remove from map.
      this.requestMap.removeEntryByUUID(entry.uuid) as any;
      console.log(`Worker ${this.id} returns a 202 Accepted`);
      return;
      /* could re-add to queue
      //set it to true so it will complete next go round.
      this.eventQueue.enqueue(entry.uuid, { 
        jobId: entry.jobId, 
        messageText: entry.messageText,
        hasInputChanged: entry.hasInputChanged ?? true,
        isProcessingRequest: false
       });
      
       this.onStateChange(this.id);
       return;
      */

    } else {
      console.log(`Worker ${this.id} simulation of long processing job is NOT running after all intervals have completed for message ${entry.uuid}`);
    }


    if (this.requestMap.get(entry.uuid)?.status !== 'WAITING' && this.requestMap.get(entry.uuid)?.status !== 'CANCELLING') {
      console.log(`Worker ${this.id} processing status = ${this.requestMap.get(entry.uuid)?.status} for message ${entry.uuid}`);
      entry = this.requestMap.updateStatus(entry.uuid, 'COMPLETED');
    } else {
      console.log(`Worker ${this.id} processing status = WAITING OR CANCELLING`);

      //Remove the entry from the request map. Next pass at logic will draw same conclusions.
      console.log(`Worker ${this.id} removing record from request map `);
      this.requestMap.removeEntryByUUID(entry.uuid);

      //put the job back in the queue so that it can be processed again with the new input or cancelled if that is what the user wants to do.
      console.log(`Worker ${this.id} Adding job back to the queue...`);
      this.eventQueue.enqueue(entry.uuid, {
        jobId: entry.jobId,
        messageText: entry.messageText,
        hasInputChanged: entry.hasInputChanged ?? true,
        isProcessingRequest: entry.isProcessingRequest ?? false
      });
      console.log(`Worker ${this.eventQueue.getAll().length} `);
    }



    //submit a promise to wait 5 seconds and delete any non-waiting entry from the request map.
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (entry.uuid && this.requestMap.get(entry.uuid)?.status !== 'WAITING') {
      this.requestMap.removeEntryByUUID(entry.uuid);
    }
    // After completing a message, try to process the next one
    this.processNextIfAvailable();
  }

  private processNextIfAvailable(): void {
    // Check if queue is paused or empty
    if (this.isPausedCallback() || this.eventQueue.isEmpty()) {
      return;
    }

    const nextEntry = this.eventQueue.dequeue();
    if (nextEntry) {
      // Process next message asynchronously without awaiting
      this.processMessage(nextEntry).catch(err => {
        console.error(`Worker ${this.id} error processing message:`, err);
      });
    }
  }

  getState_Full(): WorkerState {
    return {
      id: this.id,
      status: this.state,
      currentMessage: this.queue.length > 0 ? this.queue[this.queue.length - 1] : undefined,
      queue: [...this.queue],
      requestMapUuid: this.requestMapUuid
    };
  }
}

export class WorkerPool {
  private workers: Map<number, Worker> = new Map();
  private concurrency: number;
  private requestMap: RequestMap;
  private eventQueue: EventQueue;
  private onStateChange: (workerId: number) => void;
  private isPausedCallback: () => boolean;

  constructor(
    concurrency: number,
    requestMap: RequestMap,
    eventQueue: EventQueue,
    onStateChange: (workerId: number) => void,
    isPausedCallback: () => boolean
  ) {
    this.concurrency = concurrency;
    this.requestMap = requestMap;
    this.eventQueue = eventQueue;
    this.onStateChange = onStateChange;
    this.isPausedCallback = isPausedCallback;

    // Create workers
    for (let i = 1; i <= concurrency; i++) {
      this.workers.set(i, new Worker(i, requestMap, eventQueue, onStateChange, isPausedCallback));
    }
  }

  getWorkers(): Map<number, Worker> {
    return this.workers;
  }

  getIdleWorker(): Worker | undefined {
    for (const [, worker] of this.workers) {
      if (worker.isIdle()) {
        return worker;
      }
    }
    return undefined;
  }

  processNextMessage(paused: boolean): void {
    if (paused || this.eventQueue.isEmpty()) {
      return;
    }

    const idleWorker = this.getIdleWorker();
    if (!idleWorker) {
      return;
    }

    const entry = this.eventQueue.dequeue();
    if (entry) {
      // Process asynchronously without awaiting
      idleWorker.processMessage(entry).catch(err => {
        console.error('Error processing message:', err);
      });
    }
  }
}
