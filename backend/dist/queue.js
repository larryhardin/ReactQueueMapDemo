"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueue = exports.RequestMap = void 0;
const uuid_1 = require("uuid");
class RequestMap {
    constructor() {
        this.entries = new Map();
    }
    addRequest(message) {
        const uuid = (0, uuid_1.v4)();
        const entry = {
            uuid,
            jobId: message.jobId,
            messageText: message.messageText,
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
            status: 'NEW',
            createdAt: Date.now()
        };
        this.entries.set(uuid, entry);
    }
    updateStatus(uuid, status) {
        const entry = this.entries.get(uuid);
        if (entry) {
            entry.status = status;
        }
    }
    getAll() {
        return Array.from(this.entries.values());
    }
    getJobId(jobId) {
        for (const entry of this.entries.values()) {
            if (entry.jobId === jobId) {
                return entry.uuid;
            }
        }
        return undefined;
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
    constructor() {
        this.queue = [];
    }
    enqueue(uuid, message) {
        const entry = {
            uuid,
            jobId: message.jobId,
            messageText: message.messageText
        };
        this.queue.push(entry);
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