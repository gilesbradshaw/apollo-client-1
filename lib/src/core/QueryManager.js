"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var Deduplicator_1 = require("../transport/Deduplicator");
var isEqual_1 = require("../util/isEqual");
var types_1 = require("./types");
var store_1 = require("../queries/store");
var store_2 = require("../store");
var getFromAST_1 = require("../queries/getFromAST");
var queryTransform_1 = require("../queries/queryTransform");
var resultReducers_1 = require("../data/resultReducers");
var maybeDeepFreeze_1 = require("../util/maybeDeepFreeze");
var printer_1 = require("graphql-tag/printer");
var readFromStore_1 = require("../data/readFromStore");
var readFromStore_2 = require("../data/readFromStore");
var scheduler_1 = require("../scheduler/scheduler");
var Observable_1 = require("../util/Observable");
var errorHandling_1 = require("../util/errorHandling");
var ApolloError_1 = require("../errors/ApolloError");
var ObservableQuery_1 = require("./ObservableQuery");
var QueryManager = (function () {
    function QueryManager(_a) {
        var networkInterface = _a.networkInterface, store = _a.store, reduxRootSelector = _a.reduxRootSelector, _b = _a.reducerConfig, reducerConfig = _b === void 0 ? { mutationBehaviorReducers: {} } : _b, resultTransformer = _a.resultTransformer, resultComparator = _a.resultComparator, _c = _a.addTypename, addTypename = _c === void 0 ? true : _c, _d = _a.queryDeduplication, queryDeduplication = _d === void 0 ? false : _d;
        var _this = this;
        this.idCounter = 1;
        this.networkInterface = networkInterface;
        this.deduplicator = new Deduplicator_1.Deduplicator(networkInterface);
        this.store = store;
        this.reduxRootSelector = reduxRootSelector;
        this.reducerConfig = reducerConfig;
        this.resultTransformer = resultTransformer;
        this.resultComparator = resultComparator;
        this.pollingTimers = {};
        this.queryListeners = {};
        this.queryDocuments = {};
        this.addTypename = addTypename;
        this.queryDeduplication = queryDeduplication;
        this.scheduler = new scheduler_1.QueryScheduler({
            queryManager: this,
        });
        this.fetchQueryPromises = {};
        this.observableQueries = {};
        this.queryIdsByName = {};
        if (this.store['subscribe']) {
            var currentStoreData_1;
            this.store['subscribe'](function () {
                var previousStoreData = currentStoreData_1 || {};
                var previousStoreHasData = Object.keys(previousStoreData).length;
                currentStoreData_1 = _this.getApolloState();
                if (isEqual_1.isEqual(previousStoreData, currentStoreData_1) && previousStoreHasData) {
                    return;
                }
                _this.broadcastQueries();
            });
        }
    }
    QueryManager.prototype.broadcastNewStore = function (store) {
        this.broadcastQueries();
    };
    QueryManager.prototype.mutate = function (_a) {
        var _this = this;
        var mutation = _a.mutation, variables = _a.variables, _b = _a.resultBehaviors, resultBehaviors = _b === void 0 ? [] : _b, optimisticResponse = _a.optimisticResponse, updateQueries = _a.updateQueries, _c = _a.refetchQueries, refetchQueries = _c === void 0 ? [] : _c;
        var mutationId = this.generateQueryId();
        if (this.addTypename) {
            mutation = queryTransform_1.addTypenameToDocument(mutation);
        }
        getFromAST_1.checkDocument(mutation);
        var mutationString = printer_1.print(mutation);
        var request = {
            query: mutation,
            variables: variables,
            operationName: getFromAST_1.getOperationName(mutation),
        };
        var updateQueriesResultBehaviors = !optimisticResponse ? [] :
            this.collectResultBehaviorsFromUpdateQueries(updateQueries, { data: optimisticResponse }, true);
        this.queryDocuments[mutationId] = mutation;
        this.store.dispatch({
            type: 'APOLLO_MUTATION_INIT',
            mutationString: mutationString,
            mutation: mutation,
            variables: variables,
            operationName: getFromAST_1.getOperationName(mutation),
            mutationId: mutationId,
            optimisticResponse: optimisticResponse,
            resultBehaviors: resultBehaviors.concat(updateQueriesResultBehaviors),
            extraReducers: this.getExtraReducers(),
        });
        return new Promise(function (resolve, reject) {
            _this.networkInterface.query(request)
                .then(function (result) {
                if (result.errors) {
                    reject(new ApolloError_1.ApolloError({
                        graphQLErrors: result.errors,
                    }));
                }
                _this.store.dispatch({
                    type: 'APOLLO_MUTATION_RESULT',
                    result: result,
                    mutationId: mutationId,
                    document: mutation,
                    operationName: getFromAST_1.getOperationName(mutation),
                    variables: variables,
                    resultBehaviors: resultBehaviors.concat(_this.collectResultBehaviorsFromUpdateQueries(updateQueries, result)),
                    extraReducers: _this.getExtraReducers(),
                });
                refetchQueries.forEach(function (name) { _this.refetchQueryByName(name); });
                delete _this.queryDocuments[mutationId];
                resolve(_this.transformResult(result));
            })
                .catch(function (err) {
                _this.store.dispatch({
                    type: 'APOLLO_MUTATION_ERROR',
                    error: err,
                    mutationId: mutationId,
                });
                delete _this.queryDocuments[mutationId];
                reject(new ApolloError_1.ApolloError({
                    networkError: err,
                }));
            });
        });
    };
    QueryManager.prototype.queryListenerForObserver = function (queryId, options, observer) {
        var _this = this;
        var lastResult;
        return function (queryStoreValue) {
            if (!queryStoreValue) {
                return;
            }
            var noFetch = _this.observableQueries[queryId] ? _this.observableQueries[queryId].observableQuery.options.noFetch : options.noFetch;
            var shouldNotifyIfLoading = queryStoreValue.returnPartialData
                || queryStoreValue.previousVariables || noFetch;
            var networkStatusChanged = lastResult && queryStoreValue.networkStatus !== lastResult.networkStatus;
            if (!queryStoreValue.loading ||
                (networkStatusChanged && options.notifyOnNetworkStatusChange) ||
                shouldNotifyIfLoading) {
                if (queryStoreValue.graphQLErrors || queryStoreValue.networkError) {
                    var apolloError = new ApolloError_1.ApolloError({
                        graphQLErrors: queryStoreValue.graphQLErrors,
                        networkError: queryStoreValue.networkError,
                    });
                    if (observer.error) {
                        try {
                            observer.error(apolloError);
                        }
                        catch (e) {
                            console.error("Error in observer.error \n" + e.stack);
                        }
                    }
                    else {
                        console.error('Unhandled error', apolloError, apolloError.stack);
                        if (process.env.NODE_ENV !== 'production') {
                            console.info('An unhandled error was thrown because no error handler is registered ' +
                                'for the query ' + options.query.loc.source);
                        }
                    }
                }
                else {
                    try {
                        var resultFromStore = {
                            data: readFromStore_1.readQueryFromStore({
                                store: _this.getDataWithOptimisticResults(),
                                query: _this.queryDocuments[queryId],
                                variables: queryStoreValue.previousVariables || queryStoreValue.variables,
                                returnPartialData: options.returnPartialData || noFetch,
                                config: _this.reducerConfig,
                                previousResult: lastResult && lastResult.data,
                            }),
                            loading: queryStoreValue.loading,
                            networkStatus: queryStoreValue.networkStatus,
                        };
                        if (observer.next) {
                            var isDifferentResult = _this.resultComparator ? !_this.resultComparator(lastResult, resultFromStore) : !(lastResult &&
                                resultFromStore &&
                                lastResult.loading === resultFromStore.loading &&
                                lastResult.networkStatus === resultFromStore.networkStatus &&
                                lastResult.data === resultFromStore.data);
                            if (isDifferentResult) {
                                lastResult = resultFromStore;
                                try {
                                    observer.next(maybeDeepFreeze_1.default(_this.transformResult(resultFromStore)));
                                }
                                catch (e) {
                                    console.error("Error in observer.next \n" + e.stack);
                                }
                            }
                        }
                    }
                    catch (error) {
                        if (observer.error) {
                            observer.error(new ApolloError_1.ApolloError({
                                networkError: error,
                            }));
                        }
                        return;
                    }
                }
            }
        };
    };
    QueryManager.prototype.watchQuery = function (options, shouldSubscribe) {
        if (shouldSubscribe === void 0) { shouldSubscribe = true; }
        getFromAST_1.getQueryDefinition(options.query);
        var transformedOptions = __assign({}, options);
        if (this.addTypename) {
            transformedOptions.query = queryTransform_1.addTypenameToDocument(transformedOptions.query);
        }
        var observableQuery = new ObservableQuery_1.ObservableQuery({
            scheduler: this.scheduler,
            options: transformedOptions,
            shouldSubscribe: shouldSubscribe,
        });
        return observableQuery;
    };
    QueryManager.prototype.query = function (options) {
        var _this = this;
        if (options.returnPartialData) {
            throw new Error('returnPartialData option only supported on watchQuery.');
        }
        if (options.query.kind !== 'Document') {
            throw new Error('You must wrap the query string in a "gql" tag.');
        }
        var requestId = this.idCounter;
        var resPromise = new Promise(function (resolve, reject) {
            _this.addFetchQueryPromise(requestId, resPromise, resolve, reject);
            return _this.watchQuery(options, false).result().then(function (result) {
                _this.removeFetchQueryPromise(requestId);
                resolve(result);
            }).catch(function (error) {
                _this.removeFetchQueryPromise(requestId);
                reject(error);
            });
        });
        return resPromise;
    };
    QueryManager.prototype.fetchQuery = function (queryId, options, fetchType) {
        var _a = options.variables, variables = _a === void 0 ? {} : _a, _b = options.forceFetch, forceFetch = _b === void 0 ? false : _b, _c = options.returnPartialData, returnPartialData = _c === void 0 ? false : _c, _d = options.noFetch, noFetch = _d === void 0 ? false : _d, _e = options.metadata, metadata = _e === void 0 ? null : _e;
        var queryDoc = this.transformQueryDocument(options).queryDoc;
        var queryString = printer_1.print(queryDoc);
        var storeResult;
        var needToFetch = forceFetch;
        if (!forceFetch) {
            var _f = readFromStore_2.diffQueryAgainstStore({
                query: queryDoc,
                store: this.reduxRootSelector(this.store.getState()).data,
                returnPartialData: true,
                variables: variables,
                config: this.reducerConfig,
            }), isMissing = _f.isMissing, result = _f.result;
            needToFetch = isMissing;
            storeResult = result;
        }
        var requestId = this.generateRequestId();
        var shouldFetch = needToFetch && !noFetch;
        this.queryDocuments[queryId] = queryDoc;
        this.store.dispatch({
            type: 'APOLLO_QUERY_INIT',
            queryString: queryString,
            document: queryDoc,
            variables: variables,
            forceFetch: forceFetch,
            returnPartialData: returnPartialData || noFetch,
            queryId: queryId,
            requestId: requestId,
            storePreviousVariables: shouldFetch,
            isPoll: fetchType === types_1.FetchType.poll,
            isRefetch: fetchType === types_1.FetchType.refetch,
            metadata: metadata,
        });
        if (!shouldFetch || returnPartialData) {
            this.store.dispatch({
                type: 'APOLLO_QUERY_RESULT_CLIENT',
                result: { data: storeResult },
                variables: variables,
                document: queryDoc,
                complete: !shouldFetch,
                queryId: queryId,
                requestId: requestId,
            });
        }
        if (shouldFetch) {
            return this.fetchRequest({
                requestId: requestId,
                queryId: queryId,
                document: queryDoc,
                options: options,
            });
        }
        return Promise.resolve({ data: storeResult });
    };
    QueryManager.prototype.generateQueryId = function () {
        var queryId = this.idCounter.toString();
        this.idCounter++;
        return queryId;
    };
    QueryManager.prototype.stopQueryInStore = function (queryId) {
        this.store.dispatch({
            type: 'APOLLO_QUERY_STOP',
            queryId: queryId,
        });
    };
    ;
    QueryManager.prototype.getApolloState = function () {
        return this.reduxRootSelector(this.store.getState());
    };
    QueryManager.prototype.selectApolloState = function (store) {
        return this.reduxRootSelector(store.getState());
    };
    QueryManager.prototype.getInitialState = function () {
        return { data: this.getApolloState().data };
    };
    QueryManager.prototype.getDataWithOptimisticResults = function () {
        return store_2.getDataWithOptimisticResults(this.getApolloState());
    };
    QueryManager.prototype.addQueryListener = function (queryId, listener) {
        this.queryListeners[queryId] = this.queryListeners[queryId] || [];
        this.queryListeners[queryId].push(listener);
    };
    QueryManager.prototype.addFetchQueryPromise = function (requestId, promise, resolve, reject) {
        this.fetchQueryPromises[requestId.toString()] = { promise: promise, resolve: resolve, reject: reject };
    };
    QueryManager.prototype.removeFetchQueryPromise = function (requestId) {
        delete this.fetchQueryPromises[requestId.toString()];
    };
    QueryManager.prototype.addObservableQuery = function (queryId, observableQuery) {
        this.observableQueries[queryId] = { observableQuery: observableQuery };
        var queryDef = getFromAST_1.getQueryDefinition(observableQuery.options.query);
        if (queryDef.name && queryDef.name.value) {
            var queryName = queryDef.name.value;
            this.queryIdsByName[queryName] = this.queryIdsByName[queryName] || [];
            this.queryIdsByName[queryName].push(observableQuery.queryId);
        }
    };
    QueryManager.prototype.removeObservableQuery = function (queryId) {
        var observableQuery = this.observableQueries[queryId].observableQuery;
        var definition = getFromAST_1.getQueryDefinition(observableQuery.options.query);
        var queryName = definition.name ? definition.name.value : null;
        delete this.observableQueries[queryId];
        if (queryName) {
            this.queryIdsByName[queryName] = this.queryIdsByName[queryName].filter(function (val) {
                return !(observableQuery.queryId === val);
            });
        }
    };
    QueryManager.prototype.resetStore = function () {
        var _this = this;
        Object.keys(this.fetchQueryPromises).forEach(function (key) {
            var reject = _this.fetchQueryPromises[key].reject;
            reject(new Error('Store reset while query was in flight.'));
        });
        this.store.dispatch({
            type: 'APOLLO_STORE_RESET',
            observableQueryIds: Object.keys(this.observableQueries),
        });
        Object.keys(this.observableQueries).forEach(function (queryId) {
            var storeQuery = _this.reduxRootSelector(_this.store.getState()).queries[queryId];
            if (!_this.observableQueries[queryId].observableQuery.options.noFetch) {
                _this.observableQueries[queryId].observableQuery.refetch();
            }
        });
    };
    QueryManager.prototype.startQuery = function (queryId, options, listener) {
        this.addQueryListener(queryId, listener);
        this.fetchQuery(queryId, options)
            .catch(function (error) { return undefined; });
        return queryId;
    };
    QueryManager.prototype.startGraphQLSubscription = function (options) {
        var _this = this;
        var document = options.document, variables = options.variables;
        var transformedDoc = document;
        if (this.addTypename) {
            transformedDoc = queryTransform_1.addTypenameToDocument(transformedDoc);
        }
        var request = {
            query: transformedDoc,
            variables: variables,
            operationName: getFromAST_1.getOperationName(transformedDoc),
        };
        var subId;
        var observers = [];
        return new Observable_1.Observable(function (observer) {
            observers.push(observer);
            if (observers.length === 1) {
                var handler = function (error, result) {
                    if (error) {
                        observers.forEach(function (obs) {
                            obs.error(error);
                        });
                    }
                    else {
                        _this.store.dispatch({
                            type: 'APOLLO_SUBSCRIPTION_RESULT',
                            document: transformedDoc,
                            operationName: getFromAST_1.getOperationName(transformedDoc),
                            result: { data: result },
                            variables: variables,
                            subscriptionId: subId,
                            extraReducers: _this.getExtraReducers(),
                        });
                        observers.forEach(function (obs) {
                            obs.next(result);
                        });
                    }
                };
                subId = _this.networkInterface.subscribe(request, handler);
            }
            return {
                unsubscribe: function () {
                    observers = observers.filter(function (obs) { return obs !== observer; });
                    if (observers.length === 0) {
                        _this.networkInterface.unsubscribe(subId);
                    }
                },
                _networkSubscriptionId: subId,
            };
        });
    };
    ;
    QueryManager.prototype.stopQuery = function (queryId) {
        delete this.queryListeners[queryId];
        delete this.queryDocuments[queryId];
        this.stopQueryInStore(queryId);
    };
    QueryManager.prototype.getCurrentQueryResult = function (observableQuery, isOptimistic) {
        if (isOptimistic === void 0) { isOptimistic = false; }
        var _a = this.getQueryParts(observableQuery), variables = _a.variables, document = _a.document;
        var lastResult = observableQuery.getLastResult();
        var queryOptions = observableQuery.options;
        var readOptions = {
            store: isOptimistic ? this.getDataWithOptimisticResults() : this.getApolloState().data,
            query: document,
            variables: variables,
            returnPartialData: false,
            config: this.reducerConfig,
            previousResult: lastResult ? lastResult.data : undefined,
        };
        try {
            var data = readFromStore_1.readQueryFromStore(readOptions);
            return maybeDeepFreeze_1.default({ data: data, partial: false });
        }
        catch (e) {
            if (queryOptions.returnPartialData || queryOptions.noFetch) {
                try {
                    readOptions.returnPartialData = true;
                    var data = readFromStore_1.readQueryFromStore(readOptions);
                    return { data: data, partial: true };
                }
                catch (e) {
                }
            }
            return maybeDeepFreeze_1.default({ data: {}, partial: true });
        }
    };
    QueryManager.prototype.getQueryWithPreviousResult = function (queryIdOrObservable, isOptimistic) {
        if (isOptimistic === void 0) { isOptimistic = false; }
        var observableQuery;
        if (typeof queryIdOrObservable === 'string') {
            if (!this.observableQueries[queryIdOrObservable]) {
                throw new Error("ObservableQuery with this id doesn't exist: " + queryIdOrObservable);
            }
            observableQuery = this.observableQueries[queryIdOrObservable].observableQuery;
        }
        else {
            observableQuery = queryIdOrObservable;
        }
        var _a = this.getQueryParts(observableQuery), variables = _a.variables, document = _a.document;
        var data = this.getCurrentQueryResult(observableQuery, isOptimistic).data;
        return {
            previousResult: data,
            variables: variables,
            document: document,
        };
    };
    QueryManager.prototype.transformResult = function (result) {
        if (!this.resultTransformer) {
            return result;
        }
        else {
            return this.resultTransformer(result);
        }
    };
    QueryManager.prototype.getQueryParts = function (observableQuery) {
        var queryOptions = observableQuery.options;
        var transformedDoc = observableQuery.options.query;
        if (this.addTypename) {
            transformedDoc = queryTransform_1.addTypenameToDocument(transformedDoc);
        }
        return {
            variables: queryOptions.variables,
            document: transformedDoc,
        };
    };
    QueryManager.prototype.collectResultBehaviorsFromUpdateQueries = function (updateQueries, mutationResult, isOptimistic) {
        var _this = this;
        if (isOptimistic === void 0) { isOptimistic = false; }
        if (!updateQueries) {
            return [];
        }
        var resultBehaviors = [];
        Object.keys(updateQueries).forEach(function (queryName) {
            var reducer = updateQueries[queryName];
            var queryIds = _this.queryIdsByName[queryName];
            if (!queryIds) {
                return;
            }
            queryIds.forEach(function (queryId) {
                var _a = _this.getQueryWithPreviousResult(queryId, isOptimistic), previousResult = _a.previousResult, variables = _a.variables, document = _a.document;
                var newResult = errorHandling_1.tryFunctionOrLogError(function () { return reducer(previousResult, {
                    mutationResult: mutationResult,
                    queryName: queryName,
                    queryVariables: variables,
                }); });
                if (newResult) {
                    resultBehaviors.push({
                        type: 'QUERY_RESULT',
                        newResult: newResult,
                        variables: variables,
                        document: document,
                    });
                }
            });
        });
        return resultBehaviors;
    };
    QueryManager.prototype.transformQueryDocument = function (options) {
        var queryDoc = options.query;
        if (this.addTypename) {
            queryDoc = queryTransform_1.addTypenameToDocument(queryDoc);
        }
        return {
            queryDoc: queryDoc,
        };
    };
    QueryManager.prototype.getExtraReducers = function () {
        var _this = this;
        return Object.keys(this.observableQueries).map(function (obsQueryId) {
            var queryOptions = _this.observableQueries[obsQueryId].observableQuery.options;
            if (queryOptions.reducer) {
                return resultReducers_1.createStoreReducer(queryOptions.reducer, queryOptions.query, queryOptions.variables, _this.reducerConfig);
            }
            return null;
        }).filter(function (reducer) { return reducer !== null; });
    };
    QueryManager.prototype.fetchRequest = function (_a) {
        var _this = this;
        var requestId = _a.requestId, queryId = _a.queryId, document = _a.document, options = _a.options;
        var variables = options.variables, noFetch = options.noFetch, returnPartialData = options.returnPartialData;
        var request = {
            query: document,
            variables: variables,
            operationName: getFromAST_1.getOperationName(document),
        };
        var retPromise = new Promise(function (resolve, reject) {
            _this.addFetchQueryPromise(requestId, retPromise, resolve, reject);
            _this.deduplicator.query(request, _this.queryDeduplication)
                .then(function (result) {
                var extraReducers = _this.getExtraReducers();
                _this.store.dispatch({
                    type: 'APOLLO_QUERY_RESULT',
                    document: document,
                    operationName: getFromAST_1.getOperationName(document),
                    result: result,
                    queryId: queryId,
                    requestId: requestId,
                    extraReducers: extraReducers,
                });
                _this.removeFetchQueryPromise(requestId);
                if (result.errors) {
                    throw new ApolloError_1.ApolloError({
                        graphQLErrors: result.errors,
                    });
                }
                return result;
            }).then(function () {
                var resultFromStore;
                try {
                    resultFromStore = readFromStore_1.readQueryFromStore({
                        store: _this.getApolloState().data,
                        variables: variables,
                        returnPartialData: returnPartialData || noFetch,
                        query: document,
                        config: _this.reducerConfig,
                    });
                }
                catch (e) { }
                var reducerError = _this.getApolloState().reducerError;
                if (!resultFromStore && reducerError) {
                    return Promise.reject(reducerError);
                }
                _this.removeFetchQueryPromise(requestId);
                resolve({ data: resultFromStore, loading: false, networkStatus: store_1.NetworkStatus.ready });
                return null;
            }).catch(function (error) {
                if (ApolloError_1.isApolloError(error)) {
                    reject(error);
                }
                else {
                    _this.store.dispatch({
                        type: 'APOLLO_QUERY_ERROR',
                        error: error,
                        queryId: queryId,
                        requestId: requestId,
                    });
                    _this.removeFetchQueryPromise(requestId);
                    reject(new ApolloError_1.ApolloError({
                        networkError: error,
                    }));
                }
            });
        });
        return retPromise;
    };
    QueryManager.prototype.refetchQueryByName = function (queryName) {
        var _this = this;
        var refetchedQueries = this.queryIdsByName[queryName];
        if (refetchedQueries === undefined) {
            console.warn("Warning: unknown query with name " + queryName + " asked to refetch");
        }
        else {
            refetchedQueries.forEach(function (queryId) {
                _this.observableQueries[queryId].observableQuery.refetch();
            });
        }
    };
    QueryManager.prototype.broadcastQueries = function () {
        var _this = this;
        var queries = this.getApolloState().queries;
        Object.keys(this.queryListeners).forEach(function (queryId) {
            var listeners = _this.queryListeners[queryId];
            if (listeners) {
                listeners.forEach(function (listener) {
                    if (listener) {
                        var queryStoreValue = queries[queryId];
                        listener(queryStoreValue);
                    }
                });
            }
        });
    };
    QueryManager.prototype.generateRequestId = function () {
        var requestId = this.idCounter;
        this.idCounter++;
        return requestId;
    };
    return QueryManager;
}());
exports.QueryManager = QueryManager;
//# sourceMappingURL=QueryManager.js.map