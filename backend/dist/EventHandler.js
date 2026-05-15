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
            const timeOutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    //console.warn(`preferred time to wait - ${timeToWait} - has expired for request with uuid: ${uuid}`);
                    resolve(true);
                }, timeToWait + 2000); // Adding a buffer to ensure we wait at least the specified timeToWait and allow 4th poll to complete if it's close to the timeToWait
            });
            const interval = timeToWait / 4;
            let checksCompleted = 0;
            const pollingPromise = new Promise((resolve) => {
                const intervalId = setInterval(() => {
                    checksCompleted++;
                    const requestEntry = this.requestMap.get(uuid);
                    if (requestEntry) {
                        //console.log(`Polling check ${checksCompleted} for uuid: ${uuid}, status: ${requestEntry.status}`);
                        if (requestEntry.status === 'COMPLETED') {
                            resolve(true);
                            clearInterval(intervalId);
                        }
                    }
                    else {
                        //console.warn(`Request entry with uuid: ${uuid} not found during polling check ${checksCompleted}`);
                        resolve(true);
                        clearInterval(intervalId);
                    }
                    if (checksCompleted >= 4) {
                        resolve(false);
                        clearInterval(intervalId);
                    }
                }, interval);
            });
            const firstSuccess = await Promise.any([
                timeOutPromise,
                pollingPromise,
            ]);
            try {
                if (firstSuccess === true) {
                    console.log(`!!!!!!!!!!!!!!!!!!!!!!!!At least one promise has resolved.!!!!!!!!!!!!!!!!!!!!!!!!`);
                }
            }
            catch (error) {
                console.error('!!!!!!!!!!!!!!!!!!!!!!!!Error in waiting for processing or interval:', error);
            }
        }
        catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }
}
exports.EventHandler = EventHandler;
//# sourceMappingURL=EventHandler.js.map