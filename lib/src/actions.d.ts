/// <reference types="graphql" />
import { DocumentNode, ExecutionResult } from 'graphql';
import { MutationBehavior } from './data/mutationResults';
import { ApolloReducer } from './store';
export declare type QueryResultAction = {
    type: 'APOLLO_QUERY_RESULT';
    result: ExecutionResult;
    queryId: string;
    document: DocumentNode;
    operationName: string;
    requestId: number;
    extraReducers?: ApolloReducer[];
};
export declare function isQueryResultAction(action: ApolloAction): action is QueryResultAction;
export interface QueryErrorAction {
    type: 'APOLLO_QUERY_ERROR';
    error: Error;
    queryId: string;
    requestId: number;
}
export declare function isQueryErrorAction(action: ApolloAction): action is QueryErrorAction;
export interface QueryInitAction {
    type: 'APOLLO_QUERY_INIT';
    queryString: string;
    document: DocumentNode;
    variables: Object;
    forceFetch: boolean;
    returnPartialData: boolean;
    queryId: string;
    requestId: number;
    storePreviousVariables: boolean;
    isRefetch: boolean;
    isPoll: boolean;
    metadata: any;
}
export declare function isQueryInitAction(action: ApolloAction): action is QueryInitAction;
export interface QueryResultClientAction {
    type: 'APOLLO_QUERY_RESULT_CLIENT';
    result: ExecutionResult;
    complete: boolean;
    queryId: string;
    requestId: number;
}
export declare function isQueryResultClientAction(action: ApolloAction): action is QueryResultClientAction;
export interface QueryStopAction {
    type: 'APOLLO_QUERY_STOP';
    queryId: string;
}
export declare function isQueryStopAction(action: ApolloAction): action is QueryStopAction;
export interface MutationInitAction {
    type: 'APOLLO_MUTATION_INIT';
    mutationString: string;
    mutation: DocumentNode;
    variables: Object;
    operationName: string;
    mutationId: string;
    optimisticResponse: Object;
    resultBehaviors?: MutationBehavior[];
    extraReducers?: ApolloReducer[];
}
export declare function isMutationInitAction(action: ApolloAction): action is MutationInitAction;
export interface MutationResultAction {
    type: 'APOLLO_MUTATION_RESULT';
    result: ExecutionResult;
    document: DocumentNode;
    operationName: string;
    variables: Object;
    mutationId: string;
    resultBehaviors?: MutationBehavior[];
    extraReducers?: ApolloReducer[];
}
export declare function isMutationResultAction(action: ApolloAction): action is MutationResultAction;
export interface MutationErrorAction {
    type: 'APOLLO_MUTATION_ERROR';
    error: Error;
    mutationId: string;
}
export declare function isMutationErrorAction(action: ApolloAction): action is MutationErrorAction;
export interface UpdateQueryResultAction {
    type: 'APOLLO_UPDATE_QUERY_RESULT';
    variables: any;
    document: DocumentNode;
    newResult: Object;
}
export declare function isUpdateQueryResultAction(action: ApolloAction): action is UpdateQueryResultAction;
export interface StoreResetAction {
    type: 'APOLLO_STORE_RESET';
    observableQueryIds: string[];
}
export declare function isStoreResetAction(action: ApolloAction): action is StoreResetAction;
export declare type SubscriptionResultAction = {
    type: 'APOLLO_SUBSCRIPTION_RESULT';
    result: ExecutionResult;
    subscriptionId: number;
    variables: Object;
    document: DocumentNode;
    operationName: string;
    extraReducers?: ApolloReducer[];
};
export declare function isSubscriptionResultAction(action: ApolloAction): action is SubscriptionResultAction;
export declare type ApolloAction = QueryResultAction | QueryErrorAction | QueryInitAction | QueryResultClientAction | QueryStopAction | MutationInitAction | MutationResultAction | MutationErrorAction | UpdateQueryResultAction | StoreResetAction | SubscriptionResultAction;
