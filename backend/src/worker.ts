import { WorkerState, QueueEntry, EventRequestEntry  } from './types';
import { RequestMap, EventQueue } from './queue';

// Re-export WorkerState for use in workerpool.ts
export { WorkerState };

export class Worker {
  private readonly id: number;
  private state: 'IDLE' | 'PROCESSING' = 'IDLE';
  private queue: QueueEntry[] = [];
  private readonly requestMapUuid?: string;
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

  private determineRequestMapEntryState(queueItem: QueueEntry): 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED' {
    const hasInputChanged = queueItem.hasInputChanged ?? false;
    const isJobIDAlreadyBeingProcessed = this.getIsJobIDAlreadyBeingProcessed(queueItem);
    let requestState:'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED' = 'NEW';

    if (hasInputChanged) {
      if (isJobIDAlreadyBeingProcessed) {
        //This is cancelling the previous job(s) with the same jobId and starting this new one scenario.
        //To explain this is why the two if statements are not an if/else. 
        requestState = 'PROCESSING';

        //The job upon which this job is waiting should be cancelled. Setting it to cancelling will allow its corresponding interval polling process to cancel it.
        const cancellingJob = this.getJobToWaitFor(queueItem);
        this.requestMap.updateStatus(cancellingJob ?? '', 'CANCELLING');
      }
      if (!isJobIDAlreadyBeingProcessed) {
        requestState = 'PROCESSING';
      }
    }
    if (!hasInputChanged) {
      if (isJobIDAlreadyBeingProcessed) {
        requestState = 'WAITING';
      } else {
        //Do nothing scenario. Probably just complete it.
        requestState = 'PROCESSING';
      }
    }
    return requestState;
  }

  private getJobToWaitFor(queueItem: QueueEntry): string | undefined {
    const matchingJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
    if (matchingJobs.length > 0) {
       //return the first matching jobId for now
       return matchingJobs[0].uuid; 
    }
    return undefined;
  }

  async processMessage(queueItem: QueueEntry): Promise<void> {
    console.log(`Worker ${this.id} started processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
    //Update the worker to processing.
    this.state = 'PROCESSING';
    
    //Copy the entry to the worker's queue for tracking.
    this.queue.push(queueItem);
   

    //Determine the state for the requestMapEntry:
    const requestMapEntryState = this.determineRequestMapEntryState(queueItem);

    //Update the request map with the determined state:
    if (requestMapEntryState === 'WAITING') {
      const waitingOn = this.getJobToWaitFor(queueItem);
      this.requestMap.updateStatus(queueItem.uuid, requestMapEntryState, waitingOn);
      this.logStateMessages(queueItem);    
      await new Promise(resolve => setTimeout(resolve, 5000 ) );
    } else {
      this.requestMap.updateStatus(queueItem.uuid, requestMapEntryState);
      this.logStateMessages(queueItem);
    
      //wait at least 15 seconds before processing the next message to simulate processing time and allow for potential input changes or cancellations.
      //also allows for polling intervals to elapse.
      //display current time with seconds:      
      await new Promise(resolve => setTimeout(resolve, 15000 ) );

      //After processing, update the request map status to completed.
      const reqMapForQueueItem = this.requestMap.get(queueItem.uuid);
      if (reqMapForQueueItem) {
        if (reqMapForQueueItem.status === 'CANCELLING' || reqMapForQueueItem.status === 'WAITING') {
          console.log(`Worker ${this.id} finished processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}, but the request was marked as cancelling during processing. Updating status to cancelled.`);
          this.requestMap.updateStatus(queueItem.uuid, 'CANCELLED');
        } else {         
          this.requestMap.updateStatus(queueItem.uuid, 'COMPLETED');
        }
      }    
      console.log(`Worker ${this.id} completed processing message with uuid: ${queueItem.uuid} and jobId: ${queueItem.jobId}`);
    }
    
    //Clear the worker's queue and update state to idle.
    this.queue = [];
    this.state = 'IDLE';

    //Notify of state change so UI can update.
    this.onStateChange(this.id);

    //get the next message from the event queue and process if available and not paused.
    this.processNextIfAvailable();
  }
  
  private getNonMatchingActiveJobIds(jobId: string, uuid: string): EventRequestEntry[] {
    return this.requestMap.getNonMatchingActiveJobIds(jobId, uuid);
  }

  private getIsJobIDAlreadyBeingProcessed(queueItem: QueueEntry): boolean {
    let isBeingProcessed = false;
    
    //Search the request map for matching jobids but not matching this queueItem.uuid. 
    const matchingJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);
    console.log(`Worker ${this.id} found ${matchingJobs.length} other active job(s) with jobId: ${queueItem.jobId} that does not match its uuid: ${queueItem.uuid}`);
    
    
    //NOTE: When each worker picks up a job with the same id at the same time that they both determine that each other is already processing
    //      the job because it is added to the request map as processing before either worker checks for if the request is being processed.    
    //      set the one with the highest index to WAITING, as this indicates that it was added last. ( by returning true )
    if (matchingJobs.length > 0) {
      //Get this worker's request's position in the request map.
      let workerPosition = this.getWorkerReqPositionInRequestMap(queueItem);     
      console.log(`Worker ${this.id} has position ${workerPosition} in the list of matching active jobs with jobId: ${queueItem.jobId}`);
      
      
      
      //Is there a better way than using a loop within a loop here? 
      isBeingProcessed = this.isPredProcessingReq(matchingJobs,  workerPosition, isBeingProcessed);
    }
    return isBeingProcessed;
  }

  /*
    Loop through the elements in the matching jobs and get their index from the request map
    stop at the first one with a lower index than this worker's request - meaning it was added 
    to the request map before this worker's request, which means this worker should be waiting 
    on that job. (return true )  Set this worker's request to waiting.
    if after the loop, none are lower, then this worker can proceed with processing. (return false )
  */
  private isPredProcessingReq(matchingJobs: EventRequestEntry[],  workerPosition: number, isBeingProcessed: boolean): boolean {
    let jobPosition = -1;
    const allEntries = this.requestMap.getAll();
    for (const job of matchingJobs) {
      for (const entry of allEntries) {
        if (entry.uuid === job.uuid) {
          console.log(`Worker ${this.id} found its request in the request map with uuid: ${entry.uuid} and jobId: ${entry.jobId} at position ${allEntries.indexOf(entry)}`);
          jobPosition = allEntries.indexOf(entry);
          if ( jobPosition < workerPosition) {
            isBeingProcessed = true;
            break;
          }
        }
      }
    }

    return isBeingProcessed;
  }
 
  private getWorkerReqPositionInRequestMap(queueItem: QueueEntry): number {
    const allEntries = this.requestMap.getAll();
    for (const entry of allEntries) {
      if (entry.uuid === queueItem.uuid) {
        return allEntries.indexOf(entry);
      }
    }
    return -1;
  }

  private getHasInputChanged(queueItem: QueueEntry): boolean {
    return queueItem.hasInputChanged ?? false;
  }

  private logStateMessages(queueItem: QueueEntry): void {
    //Search the request map for matching jobids but not matching this queueItem.uuid. 
    const isJobIDAlreadyBeingProcessed = this.getIsJobIDAlreadyBeingProcessed(queueItem);
    const hasInputChanged = this.getHasInputChanged(queueItem);
    const requestMapEntry = this.requestMap.get(queueItem.uuid);    
    const otherActiveJobs = this.getNonMatchingActiveJobIds(queueItem.jobId, queueItem.uuid);

    if ( hasInputChanged ) {
      console.log(`Input has changed for the quote named  ${queueItem.jobId}` );
    } else {      
      console.log(`No input has changed for the quote named ${queueItem.jobId}` );
    }

    if ( isJobIDAlreadyBeingProcessed ) {              
      console.log(`Simulation is already is already running in the background ${queueItem.jobId}` );
    } else {
      console.log(`There is no simulation request for quote ${queueItem.jobId} already running` );      
    }

    //Scenario 1 & Scenario 4.
    if (hasInputChanged && !isJobIDAlreadyBeingProcessed) {
      console.log(`the simulation request has been started for quote named ${queueItem.jobId}`);
    }

    //Scenario 2
     if (!hasInputChanged && isJobIDAlreadyBeingProcessed) {
       //add a message that the jobid is waiting on the following active jobs:
        if (otherActiveJobs.length > 0) {
          console.log(`The request with jobId: ${queueItem.jobId} and uuid: ${queueItem.uuid} is waiting on the following active job(s)`);
          console.log(` with the same jobId: `);
          for (const job of otherActiveJobs) {
            console.log(`uuid: ${job.uuid}, message: ${job.messageText}`);
          }
        }
    }

    //Scenario 3
    if (!hasInputChanged && !isJobIDAlreadyBeingProcessed) {
      console.log(`need to respond with a 200 OK`);
    }

    //Scenario 5
    if (hasInputChanged && isJobIDAlreadyBeingProcessed) {
      if (otherActiveJobs.length > 0) {
          console.log(`The request with jobId: ${queueItem.jobId} and uuid: ${queueItem.uuid} is waiting on the following active job(s)`);
          console.log(`With the same jobId: `);
          for (const job of otherActiveJobs) {
            console.log(`uuid: ${job.uuid}, message: ${job.messageText}`);
          }
          console.log(`the simulation request should be restarted for quote named ${queueItem.jobId}`);

        }
    }
  }

  private processNextIfAvailable(): void {
    if (this.isPausedCallback() || this.eventQueue.isEmpty()) {
      return;
    }

    const nextEntry = this.eventQueue.dequeue();
    if (nextEntry) {
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