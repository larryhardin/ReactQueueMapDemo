"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
class EventHandler {
    eventQueue;
    requestMap;
    workerPool;
    //really should not know about event queue paused state here,
    //this is from ai.
    queuePaused = false;
    constructor(eventQueue, requestMap, workerPool) {
        this.eventQueue = eventQueue;
        this.requestMap = requestMap;
        this.workerPool = workerPool;
    }
    getTimeoutPromise(uuid, timeToWait) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.warn(`preferred time to wait - ${timeToWait} - has expired for request with uuid: ${uuid}`);
                resolve(true);
            }, timeToWait + 2000); // Adding a buffer to ensure we wait at least the specified timeToWait and allow 4th poll to complete if it's close to the timeToWait
        });
    }
    getPollingPromise(uuid, timeToWait) {
        const interval = timeToWait / 4;
        let checksCompleted = 0;
        return new Promise((resolve) => {
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
                            console.warn(`Request with uuid: ${uuid} is waiting, but the uuid of the request it is waiting on is not defined. This should not happend and needs to be resolved.`);
                        }
                        else {
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
                }
                else {
                    //The entry for the item no longer exists in the request map.
                    resolve(true);
                    clearInterval(intervalId);
                }
                //Interval limit reached. Resolve and continue.
                if (checksCompleted >= 4) {
                    resolve(false);
                    clearInterval(intervalId);
                }
            }, interval);
        });
    }
    async handleIncomingMessage(message) {
        try {
            const { jobId, messageText, hasInputChanged, isProcessingRequest, timeToWait } = message;
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
            const onlyTrue = (promise) => promise.then((value) => {
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
                    console.log(`!!!!!!!!!!!!!!!!!!!!!!!!At least one promise has resolved.!!!!!!!!!!!!!!!!!!!!!!!!`);
                }
            }
            catch (error) {
                console.error('!!!!!!!!!!!!!!!!!!!!!!!!Error in waiting for processing or interval:', error);
            }
            //If the request status is completed, remove it from the request map and do not add to the worker pool for processing.
            const finalRequestEntry = this.requestMap.get(uuid);
            if (finalRequestEntry)
                if (finalRequestEntry.status === 'COMPLETED') {
                    console.log(`Request with uuid: ${uuid} has been completed. Removing entry.`);
                    this.requestMap.removeEntryByUUID(uuid);
                    return;
                }
        }
        catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }
}
exports.EventHandler = EventHandler;
//# sourceMappingURL=EventHandler.js.map