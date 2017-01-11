/// <reference types="node" />
/// <reference types="graphql" />
import { NetworkInterface } from '../transport/networkInterface';
import { ResultTransformer, ResultComparator, QueryListener, ApolloQueryResult, FetchType, SubscriptionOptions } from './types';
import { ApolloStore, Store, ApolloReducerConfig } from '../store';
import { NormalizedCache } from '../data/storeUtils';
import { DocumentNode } from 'graphql';
import { MutationBehavior, MutationQueryReducersMap } from '../data/mutationResults';
import { QueryScheduler } from '../scheduler/scheduler';
import { ApolloStateSelector } from '../ApolloClient';
import { Observer, Observable } from '../util/Observable';
import { WatchQueryOptions } from './watchQueryOptions';
import { ObservableQuery } from './ObservableQuery';
export declare class QueryManager {
    pollingTimers: {
        [queryId: string]: NodeJS.Timer | any;
    };
    scheduler: QueryScheduler;
    store: ApolloStore;
    private addTypename;
    private networkInterface;
    private deduplicator;
    private reduxRootSelector;
    private resultTransformer;
    private resultComparator;
    private reducerConfig;
    private queryDeduplication;
    private queryListeners;
    private queryDocuments;
    private idCounter;
    private fetchQueryPromises;
    private observableQueries;
    private queryIdsByName;
    constructor({networkInterface, store, reduxRootSelector, reducerConfig, resultTransformer, resultComparator, addTypename, queryDeduplication}: {
        networkInterface: NetworkInterface;
        store: ApolloStore;
        reduxRootSelector: ApolloStateSelector;
        reducerConfig?: ApolloReducerConfig;
        resultTransformer?: ResultTransformer;
        resultComparator?: ResultComparator;
        addTypename?: boolean;
        queryDeduplication?: boolean;
    });
    broadcastNewStore(store: any): void;
    mutate<T>({mutation, variables, resultBehaviors, optimisticResponse, updateQueries, refetchQueries}: {
        mutation: DocumentNode;
        variables?: Object;
        resultBehaviors?: MutationBehavior[];
        optimisticResponse?: Object;
        updateQueries?: MutationQueryReducersMap;
        refetchQueries?: string[];
    }): Promise<ApolloQueryResult<T>>;
    queryListenerForObserver<T>(queryId: string, options: WatchQueryOptions, observer: Observer<ApolloQueryResult<T>>): QueryListener;
    watchQuery<T>(options: WatchQueryOptions, shouldSubscribe?: boolean): ObservableQuery<T>;
    query<T>(options: WatchQueryOptions): Promise<ApolloQueryResult<T>>;
    fetchQuery<T>(queryId: string, options: WatchQueryOptions, fetchType?: FetchType): Promise<ApolloQueryResult<T>>;
    generateQueryId(): string;
    stopQueryInStore(queryId: string): void;
    getApolloState(): Store;
    selectApolloState(store: any): Store;
    getInitialState(): {
        data: Object;
    };
    getDataWithOptimisticResults(): NormalizedCache;
    addQueryListener(queryId: string, listener: QueryListener): void;
    addFetchQueryPromise<T>(requestId: number, promise: Promise<ApolloQueryResult<T>>, resolve: (result: ApolloQueryResult<T>) => void, reject: (error: Error) => void): void;
    removeFetchQueryPromise(requestId: number): void;
    addObservableQuery<T>(queryId: string, observableQuery: ObservableQuery<T>): void;
    removeObservableQuery(queryId: string): void;
    resetStore(): void;
    startQuery<T>(queryId: string, options: WatchQueryOptions, listener: QueryListener): string;
    startGraphQLSubscription(options: SubscriptionOptions): Observable<any>;
    stopQuery(queryId: string): void;
    getCurrentQueryResult<T>(observableQuery: ObservableQuery<T>, isOptimistic?: boolean): any;
    getQueryWithPreviousResult<T>(queryIdOrObservable: string | ObservableQuery<T>, isOptimistic?: boolean): {
        previousResult: any;
        variables: {
            [key: string]: any;
        };
        document: DocumentNode;
    };
    transformResult<T>(result: ApolloQueryResult<T>): ApolloQueryResult<T>;
    private getQueryParts<T>(observableQuery);
    private collectResultBehaviorsFromUpdateQueries(updateQueries, mutationResult, isOptimistic?);
    private transformQueryDocument(options);
    private getExtraReducers();
    private fetchRequest<T>({requestId, queryId, document, options});
    private refetchQueryByName(queryName);
    private broadcastQueries();
    private generateRequestId();
}