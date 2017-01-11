/// <reference types="graphql" />
import { ApolloAction } from '../actions';
import { SelectionSetNode, GraphQLError } from 'graphql';
export interface QueryStore {
    [queryId: string]: QueryStoreValue;
}
export declare enum NetworkStatus {
    loading = 1,
    setVariables = 2,
    fetchMore = 3,
    refetch = 4,
    poll = 6,
    ready = 7,
    error = 8,
}
export declare type QueryStoreValue = {
    queryString: string;
    variables: Object;
    previousVariables: Object;
    loading: boolean;
    networkStatus: NetworkStatus;
    networkError: Error;
    graphQLErrors: GraphQLError[];
    forceFetch: boolean;
    returnPartialData: boolean;
    lastRequestId: number;
    metadata: any;
};
export interface SelectionSetWithRoot {
    id: string;
    typeName: string;
    selectionSet: SelectionSetNode;
}
export declare function queries(previousState: QueryStore, action: ApolloAction): QueryStore;
