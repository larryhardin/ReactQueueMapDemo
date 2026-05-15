// This class will handle the incoming messages, add them to the queue, and update the request map accordingly.
import { Request, Response } from 'express';
import { EventQueue } from './queue';
import { RequestMap } from './queue';
import { WorkerPool } from './workerpool';
import { Message, EventRequestEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

export class EventHandler {
    private readonly eventQueue: EventQueue;
    private readonly requestMap: RequestMap;
    private readonly workerPool: WorkerPool;
    //really should not know about event queue paused state here,
    //this is from ai.
    private queuePaused: boolean = false;

    constructor(eventQueue: EventQueue, requestMap: RequestMap, workerPool: WorkerPool) {
        this.eventQueue = eventQueue;
        this.requestMap = requestMap;
        this.workerPool = workerPool;
    }

    private getTimeoutPromise(
        uuid: string,
        timeToWait: number,
    ): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                console.warn(`preferred time to wait - ${timeToWait} - has expired for request with uuid: ${uuid}`);
                resolve(true);
            }, timeToWait + 2000); // Adding a buffer to ensure we wait at least the specified timeToWait and allow 4th poll to complete if it's close to the timeToWait
        });
    }

    private getPollingPromise(
        uuid: string,
        timeToWait: number,
    ): Promise<boolean> {
        const interval = timeToWait / 4;
        let checksCompleted = 0;
        return new Promise<boolean>((resolve) => {
            const intervalId = setInterval(() => {
                checksCompleted++;

                const requestEntry = this.requestMap.get(uuid);
                if (requestEntry) {
                    console.log(`Polling check ${checksCompleted} for jobId: ${requestEntry.jobId}, uuid: ${uuid}, status: ${requestEntry.status}, message: ${requestEntry.messageText}, waitingOn: ${requestEntry.waitingOn} `);
                    if (requestEntry.status === 'COMPLETED') {
                        resolve(true);
                        clearInterval(intervalId);
                    }

                    if (requestEntry.status === 'WAITING') {
                        //Check status of the request it's waiting on.
                        const waitingOnEntry = this.requestMap.get(requestEntry.waitingOn?.toString() || '');
                        if (waitingOnEntry === undefined) {
                            //what we have here is a failure to coordinate.
                            console.warn(`Request with uuid: ${uuid} is waiting, but the uuid of the request it is waiting on is not defined. This needs to be investigated.`);
                            //for now, resolve it and remove it from the request map to prevent it from being processed by a worker, since we don't have a way to determine when to resolve it.
                            this.requestMap.updateStatus(uuid, 'COMPLETED');
                            resolve(true);
                            clearInterval(intervalId);

                        } else {
                            console.log(`Request with uuid: ${uuid} is waiting on request with uuid: ${requestEntry.waitingOn}, which has status: ${waitingOnEntry ? waitingOnEntry.status : 'N/A'}`);
                            //If the request is not there OR the request is there but has completed or been cancelled, set this request to
                            // completed and return a 200 OK, resolve and stop polling.
                            if (!waitingOnEntry || waitingOnEntry.status === 'COMPLETED' || waitingOnEntry.status === 'CANCELLED') {
                                console.log(`resolving the wait request with uuid: ${requestEntry.uuid} since the request it was waiting on is either not in the request map or has completed or been cancelled.`);
                                console.log('return 200 ok');
                                this.requestMap.updateStatus(uuid, 'COMPLETED');
                                resolve(true);
                                clearInterval(intervalId);
                            }
                        }
                    }

                    if (requestEntry.status === 'CANCELLING') {
                        console.log(`Request with uuid: ${uuid} is being cancelled. Resolving and stopping polling.`);
                        this.requestMap.updateStatus(uuid, 'CANCELLED');
                        resolve(true);
                        clearInterval(intervalId);
                    }
                } else {
                    //The entry for the item no longer exists in the request map.
                    resolve(true);
                    clearInterval(intervalId);
                }

                //Interval limit reached. Resolve and continue.
                if (checksCompleted >= 4) {
                    console.log(`Polling check limit reached for request with uuid: ${uuid}. Resolving to false and stopping polling.`);
                    resolve(false);
                    clearInterval(intervalId);
                }
            }, interval);
        });
    }

    async handleIncomingMessage(message: Message): Promise<void> {
        try {
            const { jobId, messageText, hasInputChanged, isProcessingRequest, timeToWait }: Message = message;

            // Validate input
            if (!jobId || jobId.length > 18) {
                throw new Error('JobId is required and must be 18 characters or less');
            }
            if (!messageText || messageText.length > 50) {
                throw new Error('MessageText is required and must be 50 characters or less');
            }

            //Add to event queue, get back a uuid for the queue entry.
            const uuid = this.eventQueue.enqueue({
                jobId,
                messageText,
                hasInputChanged: hasInputChanged ?? true,
                isProcessingRequest: isProcessingRequest ?? false,
                timeToWait: timeToWait // Placeholder, can be updated with actual processing time if needed
            });

            //Add to the request map.
            this.requestMap.addRequestWithUuid(uuid, {
                jobId,
                messageText,
                hasInputChanged: hasInputChanged ?? true,
                isProcessingRequest: isProcessingRequest ?? false,
                timeToWait: timeToWait // Placeholder, can be updated with actual processing time if needed
            });
            //Set status to Processing:
            this.requestMap.updateStatus(uuid, 'PROCESSING');

            const timeOutPromise = this.getTimeoutPromise(uuid, timeToWait);
            const pollingPromise = this.getPollingPromise(uuid, timeToWait);

            const onlyTrue = <T>(promise: Promise<T>) =>
              promise.then((value) => {
                if (value === true) {
                return true;
                }
                throw new Error(`Ignored non-true result: ${String(value)}`);
              });

            const firstSuccess = await Promise.any([
                onlyTrue(timeOutPromise),
                onlyTrue(pollingPromise),
            ]);

            try {
                if (firstSuccess === true) {
                    console.log(
                        `!!!!!!!!!!!!!!!!!!!!!!!!jobId: ${jobId} messageText: ${messageText} at least one promise has resolved.!!!!!!!!!!!!!!!!!!!!!!!!`,
                    );                              
                }
            } catch (error) {
                console.error(
                    `!!!!!!!!!!!!!!!!!!!!!!!!jobId: ${jobId} messageText: ${messageText} Error in waiting for processing or interval:`,
                    error,
                );
            }

            //If the request status is completed, remove it from the request map and do not add to the worker pool for processing.
            const finalRequestEntry = this.requestMap.get(uuid);
            if ( finalRequestEntry ) 
                if(  finalRequestEntry.status === 'COMPLETED') {
                    console.log(`Request with uuid: ${uuid} jobId: ${finalRequestEntry.jobId} and message: ${finalRequestEntry.messageText} has been completed. Removing entry.`);
                    this.requestMap.removeEntryByUUID(uuid);
                    return;
                } else {
                    console.log(`Request with uuid: ${uuid} jobId: ${finalRequestEntry.jobId} and message: ${finalRequestEntry.messageText} has not been completed after waiting. Current status is: ${finalRequestEntry.status}.`);
                    }
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }
}