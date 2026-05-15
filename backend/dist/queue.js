"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueue = exports.RequestMap = void 0;
const uuid_1 = require("uuid");
class RequestMap {
    entries = new Map();
    addRequest(message) {
        const uuid = (0, uuid_1.v4)();
        const entry = {
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
    addRequestWithUuid(uuid, message) {
        const entry = {
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
    updateStatus(uuid, status, waitingOn) {
        const entry = this.entries.get(uuid);
        if (entry) {
            entry.status = status;
            entry.waitingOn = waitingOn;
        }
        return entry;
    }
    getAll() {
        return Array.from(this.entries.values());
    }
    getMatchingJobId(jobId) {
        const matchingJobs = [];
        for (const entry of this.entries.values()) {
            if (entry.jobId === jobId) {
                matchingJobs.push(entry);
            }
        }
        return matchingJobs;
    }
    getActiveJobsMatchingJobId(jobId) {
        const matchingActiveJobs = [];
        for (const entry of this.getMatchingJobId(jobId)) {
            if (entry.status === 'PROCESSING' || entry.status === 'WAITING' || entry.status === 'CANCELLING') {
                matchingActiveJobs.push(entry);
            }
        }
        return matchingActiveJobs;
    }
    getNonMatchingActiveJobIds(jobId, uuid) {
        const matchingJobs = [];
        for (const entry of this.getActiveJobsMatchingJobId(jobId)) {
            if (entry.uuid !== uuid) {
                matchingJobs.push(entry);
            }
        }
        return matchingJobs;
    }
    removeEntryByUUID(uuid) {
        this.entries.delete(uuid);
    }
    get(uuid) {
        return this.entries.get(uuid);
    }
    clear() {
        this.entries.clear();
    }
}
exports.RequestMap = RequestMap;
class EventQueue {
    queue = [];
    enqueue(message) {
        const uuid = (0, uuid_1.v4)();
        const entry = {
            uuid,
            jobId: message.jobId,
            messageText: message.messageText,
            hasInputChanged: message.hasInputChanged ?? true,
            isProcessingRequest: message.isProcessingRequest ?? false
        };
        this.queue.push(entry);
        return uuid;
    }
    dequeue() {
        return this.queue.shift();
    }
    getAll() {
        return [...this.queue];
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    clear() {
        this.queue = [];
    }
}
exports.EventQueue = EventQueue;
//# sourceMappingURL=queue.js.map