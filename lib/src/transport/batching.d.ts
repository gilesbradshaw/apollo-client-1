/// <reference types="graphql" />
import { Request } from './networkInterface';
import { ExecutionResult } from 'graphql';
export interface QueryFetchRequest {
    request: Request;
    promise?: Promise<ExecutionResult>;
    resolve?: (result: ExecutionResult) => void;
    reject?: (error: Error) => void;
}
export declare class QueryBatcher {
    queuedRequests: QueryFetchRequest[];
    private pollInterval;
    private pollTimer;
    private batchFetchFunction;
    constructor({batchFetchFunction}: {
        batchFetchFunction: (request: Request[]) => Promise<ExecutionResult[]>;
    });
    enqueueRequest(request: Request): Promise<ExecutionResult>;
    consumeQueue(): Promise<ExecutionResult>[] | undefined;
    start(pollInterval: Number): void;
    stop(): void;
}