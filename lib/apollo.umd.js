(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('whatwg-fetch'), require('graphql-tag/printer'), require('redux'), require('symbol-observable'), require('graphql-anywhere')) :
    typeof define === 'function' && define.amd ? define(['exports', 'whatwg-fetch', 'graphql-tag/printer', 'redux', 'symbol-observable', 'graphql-anywhere'], factory) :
    (factory((global.apollo = global.apollo || {}),null,global.graphqlTag_printer,global.redux,global.$$observable,global.graphqlAnywhere));
}(this, (function (exports,whatwgFetch,graphqlTag_printer,redux,$$observable,graphqlAnywhere) { 'use strict';

$$observable = 'default' in $$observable ? $$observable['default'] : $$observable;
graphqlAnywhere = 'default' in graphqlAnywhere ? graphqlAnywhere['default'] : graphqlAnywhere;

var __assign = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function printRequest(request) {
    return __assign({}, request, { query: graphqlTag_printer.print(request.query) });
}
var HTTPFetchNetworkInterface = (function () {
    function HTTPFetchNetworkInterface(uri, opts) {
        if (opts === void 0) { opts = {}; }
        if (!uri) {
            throw new Error('A remote enpdoint is required for a network layer');
        }
        if (typeof uri !== 'string') {
            throw new Error('Remote endpoint must be a string');
        }
        this._uri = uri;
        this._opts = __assign({}, opts);
        this._middlewares = [];
        this._afterwares = [];
    }
    HTTPFetchNetworkInterface.prototype.applyMiddlewares = function (_a) {
        var _this = this;
        var request = _a.request, options = _a.options;
        return new Promise(function (resolve, reject) {
            var queue = function (funcs, scope) {
                var next = function () {
                    if (funcs.length > 0) {
                        var f = funcs.shift();
                        f.applyMiddleware.apply(scope, [{ request: request, options: options }, next]);
                    }
                    else {
                        resolve({
                            request: request,
                            options: options,
                        });
                    }
                };
                next();
            };
            queue(_this._middlewares.slice(), _this);
        });
    };
    HTTPFetchNetworkInterface.prototype.applyAfterwares = function (_a) {
        var _this = this;
        var response = _a.response, options = _a.options;
        return new Promise(function (resolve, reject) {
            var queue = function (funcs, scope) {
                var next = function () {
                    if (funcs.length > 0) {
                        var f = funcs.shift();
                        f.applyAfterware.apply(scope, [{ response: response, options: options }, next]);
                    }
                    else {
                        resolve({
                            response: response,
                            options: options,
                        });
                    }
                };
                next();
            };
            queue(_this._afterwares.slice(), _this);
        });
    };
    HTTPFetchNetworkInterface.prototype.fetchFromRemoteEndpoint = function (_a) {
        var request = _a.request, options = _a.options;
        return fetch(this._uri, __assign({}, this._opts, { body: JSON.stringify(printRequest(request)), method: 'POST' }, options, { headers: __assign({ Accept: '*/*', 'Content-Type': 'application/json' }, options.headers) }));
    };
    
    HTTPFetchNetworkInterface.prototype.query = function (request) {
        var _this = this;
        var options = __assign({}, this._opts);
        return this.applyMiddlewares({
            request: request,
            options: options,
        }).then(function (rao) { return _this.fetchFromRemoteEndpoint.call(_this, rao); })
            .then(function (response) { return _this.applyAfterwares({
            response: response,
            options: options,
        }); })
            .then(function (_a) {
            var response = _a.response;
            return response.json();
        })
            .then(function (payload) {
            if (!payload.hasOwnProperty('data') && !payload.hasOwnProperty('errors')) {
                throw new Error("Server response was missing for query '" + request.debugName + "'.");
            }
            else {
                return payload;
            }
        });
    };
    
    HTTPFetchNetworkInterface.prototype.use = function (middlewares) {
        var _this = this;
        middlewares.map(function (middleware) {
            if (typeof middleware.applyMiddleware === 'function') {
                _this._middlewares.push(middleware);
            }
            else {
                throw new Error('Middleware must implement the applyMiddleware function');
            }
        });
        return this;
    };
    HTTPFetchNetworkInterface.prototype.useAfter = function (afterwares) {
        var _this = this;
        afterwares.map(function (afterware) {
            if (typeof afterware.applyAfterware === 'function') {
                _this._afterwares.push(afterware);
            }
            else {
                throw new Error('Afterware must implement the applyAfterware function');
            }
        });
        return this;
    };
    return HTTPFetchNetworkInterface;
}());
function createNetworkInterface(uriOrInterfaceOpts, secondArgOpts) {
    if (secondArgOpts === void 0) { secondArgOpts = {}; }
    if (!uriOrInterfaceOpts) {
        throw new Error('You must pass an options argument to createNetworkInterface.');
    }
    var uri;
    var opts;
    if (typeof uriOrInterfaceOpts === 'string') {
        console.warn("Passing the URI as the first argument to createNetworkInterface is deprecated as of Apollo Client 0.5. Please pass it as the \"uri\" property of the network interface options.");
        opts = secondArgOpts;
        uri = uriOrInterfaceOpts;
    }
    else {
        opts = uriOrInterfaceOpts.opts;
        uri = uriOrInterfaceOpts.uri;
    }
    return new HTTPFetchNetworkInterface(uri, opts);
}

var QueryBatcher = (function () {
    function QueryBatcher(_a) {
        var batchFetchFunction = _a.batchFetchFunction;
        this.queuedRequests = [];
        this.queuedRequests = [];
        this.batchFetchFunction = batchFetchFunction;
    }
    QueryBatcher.prototype.enqueueRequest = function (request) {
        var fetchRequest = {
            request: request,
        };
        this.queuedRequests.push(fetchRequest);
        fetchRequest.promise = new Promise(function (resolve, reject) {
            fetchRequest.resolve = resolve;
            fetchRequest.reject = reject;
        });
        return fetchRequest.promise;
    };
    QueryBatcher.prototype.consumeQueue = function () {
        if (this.queuedRequests.length < 1) {
            return undefined;
        }
        var requests = this.queuedRequests.map(function (queuedRequest) {
            return {
                query: queuedRequest.request.query,
                variables: queuedRequest.request.variables,
                operationName: queuedRequest.request.operationName,
            };
        });
        var promises = [];
        var resolvers = [];
        var rejecters = [];
        this.queuedRequests.forEach(function (fetchRequest, index) {
            promises.push(fetchRequest.promise);
            resolvers.push(fetchRequest.resolve);
            rejecters.push(fetchRequest.reject);
        });
        this.queuedRequests = [];
        var batchedPromise = this.batchFetchFunction(requests);
        batchedPromise.then(function (results) {
            results.forEach(function (result, index) {
                resolvers[index](result);
            });
        }).catch(function (error) {
            rejecters.forEach(function (rejecter, index) {
                rejecters[index](error);
            });
        });
        return promises;
    };
    QueryBatcher.prototype.start = function (pollInterval) {
        var _this = this;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        this.pollInterval = pollInterval;
        this.pollTimer = setInterval(function () {
            _this.consumeQueue();
        }, this.pollInterval);
    };
    QueryBatcher.prototype.stop = function () {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
    };
    return QueryBatcher;
}());

function assign(target) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    sources.forEach(function (source) { return Object.keys(source).forEach(function (key) {
        target[key] = source[key];
    }); });
    return target;
}

var __extends = (undefined && undefined.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __assign$1 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var HTTPBatchedNetworkInterface = (function (_super) {
    __extends(HTTPBatchedNetworkInterface, _super);
    function HTTPBatchedNetworkInterface(uri, pollInterval, fetchOpts) {
        var _this = _super.call(this, uri, fetchOpts) || this;
        if (typeof pollInterval !== 'number') {
            throw new Error("pollInterval must be a number, got " + pollInterval);
        }
        _this.pollInterval = pollInterval;
        _this.batcher = new QueryBatcher({
            batchFetchFunction: _this.batchQuery.bind(_this),
        });
        _this.batcher.start(_this.pollInterval);
        return _this;
    }
    
    HTTPBatchedNetworkInterface.prototype.query = function (request) {
        return this.batcher.enqueueRequest(request);
    };
    HTTPBatchedNetworkInterface.prototype.batchQuery = function (requests) {
        var _this = this;
        var options = __assign$1({}, this._opts);
        var middlewarePromises = [];
        requests.forEach(function (request) {
            middlewarePromises.push(_this.applyMiddlewares({
                request: request,
                options: options,
            }));
        });
        return new Promise(function (resolve, reject) {
            Promise.all(middlewarePromises).then(function (requestsAndOptions) {
                return _this.batchedFetchFromRemoteEndpoint(requestsAndOptions)
                    .then(function (result) {
                    return result.json();
                })
                    .then(function (responses) {
                    if (typeof responses.map !== 'function') {
                        throw new Error('BatchingNetworkInterface: server response is not an array');
                    }
                    var afterwaresPromises = responses.map(function (response, index) {
                        return _this.applyAfterwares({
                            response: response,
                            options: requestsAndOptions[index].options,
                        });
                    });
                    Promise.all(afterwaresPromises).then(function (responsesAndOptions) {
                        var results = [];
                        responsesAndOptions.forEach(function (result) {
                            results.push(result.response);
                        });
                        resolve(results);
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            }).catch(function (error) {
                reject(error);
            });
        });
    };
    HTTPBatchedNetworkInterface.prototype.batchedFetchFromRemoteEndpoint = function (requestsAndOptions) {
        var options = {};
        requestsAndOptions.forEach(function (requestAndOptions) {
            assign(options, requestAndOptions.options);
        });
        var printedRequests = requestsAndOptions.map(function (_a) {
            var request = _a.request;
            return printRequest(request);
        });
        return fetch(this._uri, __assign$1({}, this._opts, { body: JSON.stringify(printedRequests), method: 'POST' }, options, { headers: __assign$1({ Accept: '*/*', 'Content-Type': 'application/json' }, options.headers) }));
    };
    
    return HTTPBatchedNetworkInterface;
}(HTTPFetchNetworkInterface));
function createBatchingNetworkInterface(options) {
    if (!options) {
        throw new Error('You must pass an options argument to createNetworkInterface.');
    }
    return new HTTPBatchedNetworkInterface(options.uri, options.batchInterval, options.opts);
}

function isQueryResultAction(action) {
    return action.type === 'APOLLO_QUERY_RESULT';
}
function isQueryErrorAction(action) {
    return action.type === 'APOLLO_QUERY_ERROR';
}
function isQueryInitAction(action) {
    return action.type === 'APOLLO_QUERY_INIT';
}
function isQueryResultClientAction(action) {
    return action.type === 'APOLLO_QUERY_RESULT_CLIENT';
}
function isQueryStopAction(action) {
    return action.type === 'APOLLO_QUERY_STOP';
}
function isMutationInitAction(action) {
    return action.type === 'APOLLO_MUTATION_INIT';
}
function isMutationResultAction(action) {
    return action.type === 'APOLLO_MUTATION_RESULT';
}

function isMutationErrorAction(action) {
    return action.type === 'APOLLO_MUTATION_ERROR';
}
function isUpdateQueryResultAction(action) {
    return action.type === 'APOLLO_UPDATE_QUERY_RESULT';
}
function isStoreResetAction(action) {
    return action.type === 'APOLLO_STORE_RESET';
}
function isSubscriptionResultAction(action) {
    return action.type === 'APOLLO_SUBSCRIPTION_RESULT';
}

function checkDocument(doc) {
    if (doc.kind !== 'Document') {
        throw new Error("Expecting a parsed GraphQL document. Perhaps you need to wrap the query string in a \"gql\" tag? http://docs.apollostack.com/apollo-client/core.html#gql");
    }
    var foundOperation = false;
    doc.definitions.forEach(function (definition) {
        switch (definition.kind) {
            case 'FragmentDefinition':
                break;
            case 'OperationDefinition':
                if (foundOperation) {
                    throw new Error('Queries must have exactly one operation definition.');
                }
                foundOperation = true;
                break;
            default:
                throw new Error("Schema type definitions not allowed in queries. Found: \"" + definition.kind + "\"");
        }
    });
}
function getOperationName(doc) {
    var res = '';
    doc.definitions.forEach(function (definition) {
        if (definition.kind === 'OperationDefinition'
            && definition.name) {
            res = definition.name.value;
        }
    });
    return res;
}
function getFragmentDefinitions(doc) {
    var fragmentDefinitions = doc.definitions.filter(function (definition) {
        if (definition.kind === 'FragmentDefinition') {
            return true;
        }
        else {
            return false;
        }
    });
    return fragmentDefinitions;
}
function getQueryDefinition(doc) {
    checkDocument(doc);
    var queryDef = null;
    doc.definitions.map(function (definition) {
        if (definition.kind === 'OperationDefinition'
            && definition.operation === 'query') {
            queryDef = definition;
        }
    });
    if (!queryDef) {
        throw new Error('Must contain a query definition.');
    }
    return queryDef;
}
function getOperationDefinition(doc) {
    checkDocument(doc);
    var opDef = null;
    doc.definitions.map(function (definition) {
        if (definition.kind === 'OperationDefinition') {
            opDef = definition;
        }
    });
    if (!opDef) {
        throw new Error('Must contain a query definition.');
    }
    return opDef;
}

function createFragmentMap(fragments) {
    if (fragments === void 0) { fragments = []; }
    var symTable = {};
    fragments.forEach(function (fragment) {
        symTable[fragment.name.value] = fragment;
    });
    return symTable;
}

function isStringValue(value) {
    return value.kind === 'StringValue';
}
function isBooleanValue(value) {
    return value.kind === 'BooleanValue';
}
function isIntValue(value) {
    return value.kind === 'IntValue';
}
function isFloatValue(value) {
    return value.kind === 'FloatValue';
}
function isVariable(value) {
    return value.kind === 'Variable';
}
function isObjectValue(value) {
    return value.kind === 'ObjectValue';
}
function isListValue(value) {
    return value.kind === 'ListValue';
}
function isEnumValue(value) {
    return value.kind === 'EnumValue';
}
function valueToObjectRepresentation(argObj, name, value, variables) {
    if (isIntValue(value) || isFloatValue(value)) {
        argObj[name.value] = Number(value.value);
    }
    else if (isBooleanValue(value) || isStringValue(value)) {
        argObj[name.value] = value.value;
    }
    else if (isObjectValue(value)) {
        var nestedArgObj_1 = {};
        value.fields.map(function (obj) { return valueToObjectRepresentation(nestedArgObj_1, obj.name, obj.value, variables); });
        argObj[name.value] = nestedArgObj_1;
    }
    else if (isVariable(value)) {
        if (!variables || !(value.name.value in variables)) {
            throw new Error("The inline argument \"" + value.name.value + "\" is expected as a variable but was not provided.");
        }
        var variableValue = variables[value.name.value];
        argObj[name.value] = variableValue;
    }
    else if (isListValue(value)) {
        argObj[name.value] = value.values.map(function (listValue) {
            var nestedArgArrayObj = {};
            valueToObjectRepresentation(nestedArgArrayObj, name, listValue, variables);
            return nestedArgArrayObj[name.value];
        });
    }
    else if (isEnumValue(value)) {
        argObj[name.value] = value.value;
    }
    else {
        throw new Error("The inline argument \"" + name.value + "\" of kind \"" + value.kind + "\" is not supported.\n                    Use variables instead of inline arguments to overcome this limitation.");
    }
}
function storeKeyNameFromField(field, variables) {
    if (field.arguments && field.arguments.length) {
        var argObj_1 = {};
        field.arguments.forEach(function (_a) {
            var name = _a.name, value = _a.value;
            return valueToObjectRepresentation(argObj_1, name, value, variables);
        });
        return storeKeyNameFromFieldNameAndArgs(field.name.value, argObj_1);
    }
    return field.name.value;
}
function storeKeyNameFromFieldNameAndArgs(fieldName, args) {
    if (args) {
        var stringifiedArgs = JSON.stringify(args);
        return fieldName + "(" + stringifiedArgs + ")";
    }
    return fieldName;
}
function resultKeyNameFromField(field) {
    return field.alias ?
        field.alias.value :
        field.name.value;
}
function isField(selection) {
    return selection.kind === 'Field';
}
function isInlineFragment(selection) {
    return selection.kind === 'InlineFragment';
}
function graphQLResultHasError(result) {
    return result.errors && result.errors.length;
}
function isIdValue(idObject) {
    return (idObject != null &&
        typeof idObject === 'object' &&
        idObject.type === 'id');
}
function toIdValue(id, generated) {
    if (generated === void 0) { generated = false; }
    return {
        type: 'id',
        id: id,
        generated: generated,
    };
}
function isJsonValue(jsonObject) {
    return (jsonObject != null &&
        typeof jsonObject === 'object' &&
        jsonObject.type === 'json');
}

function shouldInclude(selection, variables) {
    if (!variables) {
        variables = {};
    }
    if (!selection.directives) {
        return true;
    }
    var res = true;
    selection.directives.forEach(function (directive) {
        if (directive.name.value !== 'skip' && directive.name.value !== 'include') {
            return;
        }
        var directiveArguments = directive.arguments;
        var directiveName = directive.name.value;
        if (directiveArguments.length !== 1) {
            throw new Error("Incorrect number of arguments for the @" + directiveName + " directive.");
        }
        var ifArgument = directive.arguments[0];
        if (!ifArgument.name || ifArgument.name.value !== 'if') {
            throw new Error("Invalid argument for the @" + directiveName + " directive.");
        }
        var ifValue = directive.arguments[0].value;
        var evaledValue = false;
        if (!ifValue || ifValue.kind !== 'BooleanValue') {
            if (ifValue.kind !== 'Variable') {
                throw new Error("Argument for the @" + directiveName + " directive must be a variable or a bool ean value.");
            }
            else {
                evaledValue = variables[ifValue.name.value];
                if (evaledValue === undefined) {
                    throw new Error("Invalid variable referenced in @" + directiveName + " directive.");
                }
            }
        }
        else {
            evaledValue = ifValue.value;
        }
        if (directiveName === 'skip') {
            evaledValue = !evaledValue;
        }
        if (!evaledValue) {
            res = false;
        }
    });
    return res;
}

var __assign$4 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function writeQueryToStore(_a) {
    var result = _a.result, query = _a.query, _b = _a.store, store = _b === void 0 ? {} : _b, variables = _a.variables, _c = _a.dataIdFromObject, dataIdFromObject = _c === void 0 ? null : _c, _d = _a.fragmentMap, fragmentMap = _d === void 0 ? {} : _d;
    var queryDefinition = getQueryDefinition(query);
    return writeSelectionSetToStore({
        dataId: 'ROOT_QUERY',
        result: result,
        selectionSet: queryDefinition.selectionSet,
        context: {
            store: store,
            variables: variables,
            dataIdFromObject: dataIdFromObject,
            fragmentMap: fragmentMap,
        },
    });
}
function writeResultToStore(_a) {
    var result = _a.result, dataId = _a.dataId, document = _a.document, _b = _a.store, store = _b === void 0 ? {} : _b, variables = _a.variables, _c = _a.dataIdFromObject, dataIdFromObject = _c === void 0 ? null : _c;
    var selectionSet = getOperationDefinition(document).selectionSet;
    var fragmentMap = createFragmentMap(getFragmentDefinitions(document));
    return writeSelectionSetToStore({
        result: result,
        dataId: dataId,
        selectionSet: selectionSet,
        context: {
            store: store,
            variables: variables,
            dataIdFromObject: dataIdFromObject,
            fragmentMap: fragmentMap,
        },
    });
}
function writeSelectionSetToStore(_a) {
    var result = _a.result, dataId = _a.dataId, selectionSet = _a.selectionSet, context = _a.context;
    var variables = context.variables, store = context.store, dataIdFromObject = context.dataIdFromObject, fragmentMap = context.fragmentMap;
    selectionSet.selections.forEach(function (selection) {
        var included = shouldInclude(selection, variables);
        if (isField(selection)) {
            var resultFieldKey = resultKeyNameFromField(selection);
            var value = result[resultFieldKey];
            if (value !== undefined) {
                writeFieldToStore({
                    dataId: dataId,
                    value: value,
                    field: selection,
                    context: context,
                });
            }
        }
        else if (isInlineFragment(selection)) {
            if (included) {
                writeSelectionSetToStore({
                    result: result,
                    selectionSet: selection.selectionSet,
                    dataId: dataId,
                    context: context,
                });
            }
        }
        else {
            var fragment = void 0;
            if (isInlineFragment(selection)) {
                fragment = selection;
            }
            else {
                fragment = fragmentMap[selection.name.value];
                if (!fragment) {
                    throw new Error("No fragment named " + selection.name.value + ".");
                }
            }
            if (included) {
                writeSelectionSetToStore({
                    result: result,
                    selectionSet: fragment.selectionSet,
                    dataId: dataId,
                    context: context,
                });
            }
        }
    });
    return store;
}
function isGeneratedId(id) {
    return (id[0] === '$');
}
function mergeWithGenerated(generatedKey, realKey, cache) {
    var generated = cache[generatedKey];
    var real = cache[realKey];
    Object.keys(generated).forEach(function (key) {
        var value = generated[key];
        var realValue = real[key];
        if (isIdValue(value)
            && isGeneratedId(value.id)
            && isIdValue(realValue)) {
            mergeWithGenerated(value.id, realValue.id, cache);
        }
        delete cache[generatedKey];
        cache[realKey] = __assign$4({}, generated, real);
    });
}
function writeFieldToStore(_a) {
    var field = _a.field, value = _a.value, dataId = _a.dataId, context = _a.context;
    var variables = context.variables, dataIdFromObject = context.dataIdFromObject, store = context.store, fragmentMap = context.fragmentMap;
    var storeValue;
    var storeFieldName = storeKeyNameFromField(field, variables);
    var shouldMerge = false;
    var generatedKey;
    if (!field.selectionSet || value === null) {
        storeValue =
            value != null && typeof value === 'object'
                ? { type: 'json', json: value }
                : value;
    }
    else if (Array.isArray(value)) {
        var generatedId = dataId + "." + storeFieldName;
        storeValue = processArrayValue(value, generatedId, field.selectionSet, context);
    }
    else {
        var valueDataId = dataId + "." + storeFieldName;
        var generated = true;
        if (!isGeneratedId(valueDataId)) {
            valueDataId = '$' + valueDataId;
        }
        if (dataIdFromObject) {
            var semanticId = dataIdFromObject(value);
            if (semanticId && isGeneratedId(semanticId)) {
                throw new Error('IDs returned by dataIdFromObject cannot begin with the "$" character.');
            }
            if (semanticId) {
                valueDataId = semanticId;
                generated = false;
            }
        }
        writeSelectionSetToStore({
            dataId: valueDataId,
            result: value,
            selectionSet: field.selectionSet,
            context: context,
        });
        storeValue = {
            type: 'id',
            id: valueDataId,
            generated: generated,
        };
        if (store[dataId] && store[dataId][storeFieldName] !== storeValue) {
            var escapedId = store[dataId][storeFieldName];
            if (isIdValue(storeValue) && storeValue.generated
                && isIdValue(escapedId) && !escapedId.generated) {
                throw new Error("Store error: the application attempted to write an object with no provided id" +
                    (" but the store already contains an id of " + escapedId.id + " for this object."));
            }
            if (isIdValue(escapedId) && escapedId.generated) {
                generatedKey = escapedId.id;
                shouldMerge = true;
            }
        }
    }
    var newStoreObj = __assign$4({}, store[dataId], (_b = {}, _b[storeFieldName] = storeValue, _b));
    if (shouldMerge) {
        mergeWithGenerated(generatedKey, storeValue.id, store);
    }
    if (!store[dataId] || storeValue !== store[dataId][storeFieldName]) {
        store[dataId] = newStoreObj;
    }
    var _b;
}
function processArrayValue(value, generatedId, selectionSet, context) {
    return value.map(function (item, index) {
        if (item === null) {
            return null;
        }
        var itemDataId = generatedId + "." + index;
        if (Array.isArray(item)) {
            return processArrayValue(item, itemDataId, selectionSet, context);
        }
        var generated = true;
        if (context.dataIdFromObject) {
            var semanticId = context.dataIdFromObject(item);
            if (semanticId) {
                itemDataId = semanticId;
                generated = false;
            }
        }
        writeSelectionSetToStore({
            dataId: itemDataId,
            result: item,
            selectionSet: selectionSet,
            context: context,
        });
        var idStoreValue = {
            type: 'id',
            id: itemDataId,
            generated: generated,
        };
        return idStoreValue;
    });
}

function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map(function (item) { return cloneDeep(item); });
    }
    if (value !== null && typeof value === 'object') {
        var nextValue = {};
        for (var key in value) {
            if (value.hasOwnProperty(key)) {
                nextValue[key] = cloneDeep(value[key]);
            }
        }
        return nextValue;
    }
    return value;
}

var __assign$6 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function replaceQueryResults(state, _a, config) {
    var variables = _a.variables, document = _a.document, newResult = _a.newResult;
    var clonedState = __assign$6({}, state);
    return writeResultToStore({
        result: newResult,
        dataId: 'ROOT_QUERY',
        variables: variables,
        document: document,
        store: clonedState,
        dataIdFromObject: config.dataIdFromObject,
    });
}

function scopeJSONToResultPath(_a) {
    var json = _a.json, path = _a.path;
    var current = json;
    path.forEach(function (pathSegment) {
        current = current[pathSegment];
    });
    return current;
}
function scopeSelectionSetToResultPath(_a) {
    var selectionSet = _a.selectionSet, fragmentMap = _a.fragmentMap, path = _a.path;
    var currSelSet = selectionSet;
    path
        .filter(function (pathSegment) { return typeof pathSegment !== 'number'; })
        .forEach(function (pathSegment) {
        currSelSet = followOnePathSegment(currSelSet, pathSegment, fragmentMap);
    });
    return currSelSet;
}
function followOnePathSegment(currSelSet, pathSegment, fragmentMap) {
    var matchingFields = getMatchingFields(currSelSet, pathSegment, fragmentMap);
    if (matchingFields.length < 1) {
        throw new Error("No matching field found in query for path segment: " + pathSegment);
    }
    if (matchingFields.length > 1) {
        throw new Error("Multiple fields found in query for path segment \"" + pathSegment + "\". Please file an issue on Apollo Client if you run into this situation.");
    }
    return matchingFields[0].selectionSet;
}
function getMatchingFields(currSelSet, pathSegment, fragmentMap) {
    var matching = [];
    currSelSet.selections.forEach(function (selection) {
        if (isField(selection)) {
            if (resultKeyNameFromField(selection) === pathSegment) {
                matching.push(selection);
            }
        }
        else if (isInlineFragment(selection)) {
            matching = matching.concat(getMatchingFields(selection.selectionSet, pathSegment, fragmentMap));
        }
        else {
            var fragment = fragmentMap[selection.name.value];
            matching = matching.concat(getMatchingFields(fragment.selectionSet, pathSegment, fragmentMap));
        }
    });
    return matching;
}

var __assign$5 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function mutationResultArrayInsertReducer(state, _a) {
    var behavior = _a.behavior, result = _a.result, variables = _a.variables, document = _a.document, config = _a.config;
    var _b = behavior, resultPath = _b.resultPath, storePath = _b.storePath, where = _b.where;
    var selectionSet = getOperationDefinition(document).selectionSet;
    var fragmentMap = createFragmentMap(getFragmentDefinitions(document));
    var scopedSelectionSet = scopeSelectionSetToResultPath({
        selectionSet: selectionSet,
        fragmentMap: fragmentMap,
        path: resultPath,
    });
    var scopedResult = scopeJSONToResultPath({
        json: result.data,
        path: resultPath,
    });
    var dataId = config.dataIdFromObject(scopedResult) || generateMutationResultDataId();
    state = writeSelectionSetToStore({
        result: scopedResult,
        dataId: dataId,
        selectionSet: scopedSelectionSet,
        context: {
            store: state,
            variables: variables,
            dataIdFromObject: config.dataIdFromObject,
            fragmentMap: fragmentMap,
        },
    });
    var dataIdOfObj = storePath[0], restStorePath = storePath.slice(1);
    var clonedObj = cloneDeep(state[dataIdOfObj]);
    var array = scopeJSONToResultPath({
        json: clonedObj,
        path: restStorePath,
    });
    var idValue = { type: 'id', generated: false, id: dataId };
    if (where === 'PREPEND') {
        array.unshift(idValue);
    }
    else if (where === 'APPEND') {
        array.push(idValue);
    }
    else {
        throw new Error('Unsupported "where" option to ARRAY_INSERT.');
    }
    return __assign$5({}, state, (_c = {}, _c[dataIdOfObj] = clonedObj, _c));
    var _c;
}
var currId = 0;
function generateMutationResultDataId() {
    currId++;
    return "ARRAY_INSERT-gen-id-" + currId;
}
function mutationResultDeleteReducer(state, _a) {
    var behavior = _a.behavior;
    var dataId = behavior.dataId;
    delete state[dataId];
    var newState = {};
    Object.keys(state).forEach(function (key) {
        var storeObj = state[key];
        newState[key] = removeRefsFromStoreObj(storeObj, dataId);
    });
    return newState;
}
function removeRefsFromStoreObj(storeObj, dataId) {
    var affected = false;
    var cleanedObj = {};
    Object.keys(storeObj).forEach(function (key) {
        var value = storeObj[key];
        if (value && value.id === dataId) {
            affected = true;
            cleanedObj[key] = null;
            return;
        }
        if (Array.isArray(value)) {
            var filteredArray = cleanArray(value, dataId);
            if (filteredArray !== value) {
                affected = true;
                cleanedObj[key] = filteredArray;
                return;
            }
        }
        cleanedObj[key] = value;
    });
    if (affected) {
        return cleanedObj;
    }
    else {
        return storeObj;
    }
}
function cleanArray(originalArray, dataId) {
    if (originalArray.length && Array.isArray(originalArray[0])) {
        var modified_1 = false;
        var filteredArray = originalArray.map(function (nestedArray) {
            var nestedFilteredArray = cleanArray(nestedArray, dataId);
            if (nestedFilteredArray !== nestedArray) {
                modified_1 = true;
                return nestedFilteredArray;
            }
            return nestedArray;
        });
        if (!modified_1) {
            return originalArray;
        }
        return filteredArray;
    }
    else {
        var filteredArray = originalArray.filter(function (item) { return item.id !== dataId; });
        if (filteredArray.length === originalArray.length) {
            return originalArray;
        }
        return filteredArray;
    }
}
function mutationResultArrayDeleteReducer(state, _a) {
    var behavior = _a.behavior;
    var _b = behavior, dataId = _b.dataId, storePath = _b.storePath;
    var dataIdOfObj = storePath[0], restStorePath = storePath.slice(1);
    var clonedObj = cloneDeep(state[dataIdOfObj]);
    var array = scopeJSONToResultPath({
        json: clonedObj,
        path: restStorePath,
    });
    var index = -1;
    array.some(function (item, i) {
        if (item && item.id === dataId) {
            index = i;
            return true;
        }
        return false;
    });
    if (index === -1) {
        return state;
    }
    array.splice(index, 1);
    return __assign$5({}, state, (_c = {}, _c[dataIdOfObj] = clonedObj, _c));
    var _c;
}
function mutationResultQueryResultReducer(state, _a) {
    var behavior = _a.behavior, config = _a.config;
    return replaceQueryResults(state, behavior, config);
}
var defaultMutationBehaviorReducers = {
    'ARRAY_INSERT': mutationResultArrayInsertReducer,
    'DELETE': mutationResultDeleteReducer,
    'ARRAY_DELETE': mutationResultArrayDeleteReducer,
    'QUERY_RESULT': mutationResultQueryResultReducer,
};

var __assign$3 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function data(previousState, action, queries, mutations, config) {
    if (previousState === void 0) { previousState = {}; }
    var constAction = action;
    if (isQueryResultAction(action)) {
        if (!queries[action.queryId]) {
            return previousState;
        }
        if (action.requestId < queries[action.queryId].lastRequestId) {
            return previousState;
        }
        if (!graphQLResultHasError(action.result)) {
            var queryStoreValue = queries[action.queryId];
            var clonedState = __assign$3({}, previousState);
            var newState_1 = writeResultToStore({
                result: action.result.data,
                dataId: 'ROOT_QUERY',
                document: action.document,
                variables: queryStoreValue.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
            });
            if (action.extraReducers) {
                action.extraReducers.forEach(function (reducer) {
                    newState_1 = reducer(newState_1, constAction);
                });
            }
            return newState_1;
        }
    }
    else if (isSubscriptionResultAction(action)) {
        if (!graphQLResultHasError(action.result)) {
            var clonedState = __assign$3({}, previousState);
            var newState_2 = writeResultToStore({
                result: action.result.data,
                dataId: 'ROOT_SUBSCRIPTION',
                document: action.document,
                variables: action.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
            });
            if (action.extraReducers) {
                action.extraReducers.forEach(function (reducer) {
                    newState_2 = reducer(newState_2, constAction);
                });
            }
            return newState_2;
        }
    }
    else if (isMutationResultAction(constAction)) {
        if (!constAction.result.errors) {
            var queryStoreValue_1 = mutations[constAction.mutationId];
            var clonedState = __assign$3({}, previousState);
            var newState_3 = writeResultToStore({
                result: constAction.result.data,
                dataId: 'ROOT_MUTATION',
                document: constAction.document,
                variables: queryStoreValue_1.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
            });
            if (constAction.resultBehaviors) {
                constAction.resultBehaviors.forEach(function (behavior) {
                    var args = {
                        behavior: behavior,
                        result: constAction.result,
                        variables: queryStoreValue_1.variables,
                        document: constAction.document,
                        config: config,
                    };
                    if (defaultMutationBehaviorReducers[behavior.type]) {
                        newState_3 = defaultMutationBehaviorReducers[behavior.type](newState_3, args);
                    }
                    else if (config.mutationBehaviorReducers[behavior.type]) {
                        newState_3 = config.mutationBehaviorReducers[behavior.type](newState_3, args);
                    }
                    else {
                        throw new Error("No mutation result reducer defined for type " + behavior.type);
                    }
                });
            }
            if (constAction.extraReducers) {
                constAction.extraReducers.forEach(function (reducer) {
                    newState_3 = reducer(newState_3, constAction);
                });
            }
            return newState_3;
        }
    }
    else if (isUpdateQueryResultAction(constAction)) {
        return replaceQueryResults(previousState, constAction, config);
    }
    else if (isStoreResetAction(action)) {
        return {};
    }
    return previousState;
}

function isEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a != null && typeof a === 'object' && b != null && typeof b === 'object') {
        for (var key in a) {
            if (a.hasOwnProperty(key)) {
                if (!b.hasOwnProperty(key)) {
                    return false;
                }
                if (!isEqual(a[key], b[key])) {
                    return false;
                }
            }
        }
        for (var key in b) {
            if (!a.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

var __assign$7 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};

(function (NetworkStatus) {
    NetworkStatus[NetworkStatus["loading"] = 1] = "loading";
    NetworkStatus[NetworkStatus["setVariables"] = 2] = "setVariables";
    NetworkStatus[NetworkStatus["fetchMore"] = 3] = "fetchMore";
    NetworkStatus[NetworkStatus["refetch"] = 4] = "refetch";
    NetworkStatus[NetworkStatus["poll"] = 6] = "poll";
    NetworkStatus[NetworkStatus["ready"] = 7] = "ready";
    NetworkStatus[NetworkStatus["error"] = 8] = "error";
})(exports.NetworkStatus || (exports.NetworkStatus = {}));
function queries(previousState, action) {
    if (previousState === void 0) { previousState = {}; }
    if (isQueryInitAction(action)) {
        var newState = __assign$7({}, previousState);
        var previousQuery = previousState[action.queryId];
        if (previousQuery && previousQuery.queryString !== action.queryString) {
            throw new Error('Internal Error: may not update existing query string in store');
        }
        var isSetVariables = false;
        var previousVariables = void 0;
        if (action.storePreviousVariables &&
            previousQuery &&
            previousQuery.networkStatus !== exports.NetworkStatus.loading) {
            if (!isEqual(previousQuery.variables, action.variables)) {
                isSetVariables = true;
                previousVariables = previousQuery.variables;
            }
        }
        var newNetworkStatus = exports.NetworkStatus.loading;
        if (isSetVariables) {
            newNetworkStatus = exports.NetworkStatus.setVariables;
        }
        else if (action.isPoll) {
            newNetworkStatus = exports.NetworkStatus.poll;
        }
        else if (action.isRefetch) {
            newNetworkStatus = exports.NetworkStatus.refetch;
        }
        else if (action.isPoll) {
            newNetworkStatus = exports.NetworkStatus.poll;
        }
        newState[action.queryId] = {
            queryString: action.queryString,
            variables: action.variables,
            previousVariables: previousVariables,
            loading: true,
            networkError: null,
            graphQLErrors: null,
            networkStatus: newNetworkStatus,
            forceFetch: action.forceFetch,
            returnPartialData: action.returnPartialData,
            lastRequestId: action.requestId,
            metadata: action.metadata,
        };
        return newState;
    }
    else if (isQueryResultAction(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        if (action.requestId < previousState[action.queryId].lastRequestId) {
            return previousState;
        }
        var newState = __assign$7({}, previousState);
        var resultHasGraphQLErrors = graphQLResultHasError(action.result);
        newState[action.queryId] = __assign$7({}, previousState[action.queryId], { loading: false, networkError: null, graphQLErrors: resultHasGraphQLErrors ? action.result.errors : null, previousVariables: null, networkStatus: exports.NetworkStatus.ready });
        return newState;
    }
    else if (isQueryErrorAction(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        if (action.requestId < previousState[action.queryId].lastRequestId) {
            return previousState;
        }
        var newState = __assign$7({}, previousState);
        newState[action.queryId] = __assign$7({}, previousState[action.queryId], { loading: false, networkError: action.error, networkStatus: exports.NetworkStatus.error });
        return newState;
    }
    else if (isQueryResultClientAction(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        var newState = __assign$7({}, previousState);
        newState[action.queryId] = __assign$7({}, previousState[action.queryId], { loading: !action.complete, networkError: null, previousVariables: null, networkStatus: action.complete ? exports.NetworkStatus.ready : exports.NetworkStatus.loading });
        return newState;
    }
    else if (isQueryStopAction(action)) {
        var newState = __assign$7({}, previousState);
        delete newState[action.queryId];
        return newState;
    }
    else if (isStoreResetAction(action)) {
        return resetQueryState(previousState, action);
    }
    return previousState;
}
function resetQueryState(state, action) {
    var observableQueryIds = action.observableQueryIds;
    var newQueries = Object.keys(state).filter(function (queryId) {
        return (observableQueryIds.indexOf(queryId) > -1);
    }).reduce(function (res, key) {
        res[key] = __assign$7({}, state[key], { loading: true, networkStatus: exports.NetworkStatus.loading });
        return res;
    }, {});
    return newQueries;
}

var __assign$8 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function mutations(previousState, action) {
    if (previousState === void 0) { previousState = {}; }
    if (isMutationInitAction(action)) {
        var newState = __assign$8({}, previousState);
        newState[action.mutationId] = {
            mutationString: action.mutationString,
            variables: action.variables,
            loading: true,
            error: null,
        };
        return newState;
    }
    else if (isMutationResultAction(action)) {
        var newState = __assign$8({}, previousState);
        newState[action.mutationId] = __assign$8({}, previousState[action.mutationId], { loading: false, error: null });
        return newState;
    }
    else if (isMutationErrorAction(action)) {
        var newState = __assign$8({}, previousState);
        newState[action.mutationId] = __assign$8({}, previousState[action.mutationId], { loading: false, error: action.error });
    }
    else if (isStoreResetAction(action)) {
        return {};
    }
    return previousState;
}

var __assign$9 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var optimisticDefaultState = [];
function getDataWithOptimisticResults(store) {
    if (store.optimistic.length === 0) {
        return store.data;
    }
    var patches = store.optimistic.map(function (opt) { return opt.data; });
    return assign.apply(void 0, [{}, store.data].concat(patches));
}
function optimistic(previousState, action, store, config) {
    if (previousState === void 0) { previousState = optimisticDefaultState; }
    if (isMutationInitAction(action) && action.optimisticResponse) {
        var fakeMutationResultAction = {
            type: 'APOLLO_MUTATION_RESULT',
            result: { data: action.optimisticResponse },
            document: action.mutation,
            operationName: action.operationName,
            variables: action.variables,
            mutationId: action.mutationId,
            resultBehaviors: action.resultBehaviors,
            extraReducers: action.extraReducers,
        };
        var fakeStore = __assign$9({}, store, { optimistic: previousState });
        var optimisticData_1 = getDataWithOptimisticResults(fakeStore);
        var fakeDataResultState_1 = data(optimisticData_1, fakeMutationResultAction, store.queries, store.mutations, config);
        var patch_1 = {};
        Object.keys(fakeDataResultState_1).forEach(function (key) {
            if (optimisticData_1[key] !== fakeDataResultState_1[key]) {
                patch_1[key] = fakeDataResultState_1[key];
            }
        });
        var optimisticState = {
            data: patch_1,
            mutationId: action.mutationId,
        };
        var newState = previousState.concat([optimisticState]);
        return newState;
    }
    else if ((isMutationErrorAction(action) || isMutationResultAction(action))
        && previousState.some(function (change) { return change.mutationId === action.mutationId; })) {
        var newState = previousState.filter(function (change) { return change.mutationId !== action.mutationId; });
        return newState;
    }
    return previousState;
}

var __assign$2 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var crashReporter = function (store) { return function (next) { return function (action) {
    try {
        return next(action);
    }
    catch (err) {
        console.error('Caught an exception!', err);
        console.error(err.stack);
        throw err;
    }
}; }; };
function createApolloReducer(config) {
    return function apolloReducer(state, action) {
        if (state === void 0) { state = {}; }
        try {
            var newState = {
                queries: queries(state.queries, action),
                mutations: mutations(state.mutations, action),
                data: data(state.data, action, state.queries, state.mutations, config),
                optimistic: [],
                reducerError: null,
            };
            newState.optimistic = optimistic(state.optimistic, action, newState, config);
            if (state.data === newState.data &&
                state.mutations === newState.mutations &&
                state.queries === newState.queries &&
                state.optimistic === newState.optimistic &&
                state.reducerError === newState.reducerError) {
                return state;
            }
            return newState;
        }
        catch (reducerError) {
            return __assign$2({}, state, { reducerError: reducerError });
        }
    };
}
function createApolloStore(_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.reduxRootKey, reduxRootKey = _c === void 0 ? 'apollo' : _c, initialState = _b.initialState, _d = _b.config, config = _d === void 0 ? {} : _d, _e = _b.reportCrashes, reportCrashes = _e === void 0 ? true : _e, logger = _b.logger;
    var enhancers = [];
    var middlewares = [];
    if (reportCrashes) {
        middlewares.push(crashReporter);
    }
    if (logger) {
        middlewares.push(logger);
    }
    if (middlewares.length > 0) {
        enhancers.push(redux.applyMiddleware.apply(void 0, middlewares));
    }
    if (typeof window !== 'undefined') {
        var anyWindow = window;
        if (anyWindow.devToolsExtension) {
            enhancers.push(anyWindow.devToolsExtension());
        }
    }
    var compose$$1 = redux.compose;
    if (initialState && initialState[reduxRootKey] && initialState[reduxRootKey]['queries']) {
        throw new Error('Apollo initial state may not contain queries, only data');
    }
    if (initialState && initialState[reduxRootKey] && initialState[reduxRootKey]['mutations']) {
        throw new Error('Apollo initial state may not contain mutations, only data');
    }
    return redux.createStore(redux.combineReducers((_f = {}, _f[reduxRootKey] = createApolloReducer(config), _f)), initialState, compose$$1.apply(void 0, enhancers));
    var _f;
}

function isSubscription(subscription) {
    return subscription.unsubscribe !== undefined;
}
var Observable = (function () {
    function Observable(subscriberFunction) {
        this.subscriberFunction = subscriberFunction;
    }
    Observable.prototype[$$observable] = function () {
        return this;
    };
    Observable.prototype.subscribe = function (observer) {
        var subscriptionOrCleanupFunction = this.subscriberFunction(observer);
        if (isSubscription(subscriptionOrCleanupFunction)) {
            return subscriptionOrCleanupFunction;
        }
        else {
            return {
                unsubscribe: subscriptionOrCleanupFunction,
            };
        }
    };
    return Observable;
}());

var __extends$2 = (undefined && undefined.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function isApolloError(err) {
    return err.hasOwnProperty('graphQLErrors');
}
var generateErrorMessage = function (err) {
    var message = '';
    if (Array.isArray(err.graphQLErrors) && err.graphQLErrors.length !== 0) {
        err.graphQLErrors.forEach(function (graphQLError) {
            message += 'GraphQL error: ' + graphQLError.message + '\n';
        });
    }
    if (err.networkError) {
        message += 'Network error: ' + err.networkError.message + '\n';
    }
    message = message.replace(/\n$/, '');
    return message;
};
var ApolloError = (function (_super) {
    __extends$2(ApolloError, _super);
    function ApolloError(_a) {
        var graphQLErrors = _a.graphQLErrors, networkError = _a.networkError, errorMessage = _a.errorMessage, extraInfo = _a.extraInfo;
        var _this = _super.call(this, errorMessage) || this;
        _this.graphQLErrors = graphQLErrors;
        _this.networkError = networkError;
        _this.stack = new Error().stack;
        if (!errorMessage) {
            _this.message = generateErrorMessage(_this);
        }
        else {
            _this.message = errorMessage;
        }
        _this.extraInfo = extraInfo;
        return _this;
    }
    return ApolloError;
}(Error));

var FetchType;
(function (FetchType) {
    FetchType[FetchType["normal"] = 1] = "normal";
    FetchType[FetchType["refetch"] = 2] = "refetch";
    FetchType[FetchType["poll"] = 3] = "poll";
})(FetchType || (FetchType = {}));

function tryFunctionOrLogError(f) {
    try {
        return f();
    }
    catch (e) {
        if (console.error) {
            console.error(e);
        }
    }
}

var __extends$1 = (undefined && undefined.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __assign$10 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var ObservableQuery = (function (_super) {
    __extends$1(ObservableQuery, _super);
    function ObservableQuery(_a) {
        var scheduler = _a.scheduler, options = _a.options, _b = _a.shouldSubscribe, shouldSubscribe = _b === void 0 ? true : _b;
        var _this;
        var queryManager = scheduler.queryManager;
        var queryId = queryManager.generateQueryId();
        var subscriberFunction = function (observer) {
            return _this.onSubscribe(observer);
        };
        _this = _super.call(this, subscriberFunction) || this;
        _this.isCurrentlyPolling = false;
        _this.options = options;
        _this.variables = _this.options.variables || {};
        _this.scheduler = scheduler;
        _this.queryManager = queryManager;
        _this.queryId = queryId;
        _this.shouldSubscribe = shouldSubscribe;
        _this.observers = [];
        _this.subscriptionHandles = [];
        return _this;
    }
    ObservableQuery.prototype.result = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscription = _this.subscribe({
                next: function (result) {
                    resolve(result);
                    setTimeout(function () {
                        subscription.unsubscribe();
                    }, 0);
                },
                error: function (error) {
                    reject(error);
                },
            });
        });
    };
    ObservableQuery.prototype.currentResult = function () {
        var _a = this.queryManager.getCurrentQueryResult(this, true), data = _a.data, partial = _a.partial;
        var queryStoreValue = this.queryManager.getApolloState().queries[this.queryId];
        if (queryStoreValue && (queryStoreValue.graphQLErrors || queryStoreValue.networkError)) {
            var error = new ApolloError({
                graphQLErrors: queryStoreValue.graphQLErrors,
                networkError: queryStoreValue.networkError,
            });
            return { data: {}, loading: false, networkStatus: queryStoreValue.networkStatus, error: error };
        }
        var queryLoading = !queryStoreValue || queryStoreValue.loading;
        var loading = (this.options.forceFetch && queryLoading)
            || (partial && !this.options.noFetch);
        var networkStatus;
        if (queryStoreValue) {
            networkStatus = queryStoreValue.networkStatus;
        }
        else {
            networkStatus = loading ? exports.NetworkStatus.loading : exports.NetworkStatus.ready;
        }
        return { data: data, loading: loading, networkStatus: networkStatus };
    };
    ObservableQuery.prototype.getLastResult = function () {
        return this.lastResult;
    };
    ObservableQuery.prototype.refetch = function (variables) {
        var _this = this;
        this.variables = __assign$10({}, this.variables, variables);
        if (this.options.noFetch) {
            throw new Error('noFetch option should not use query refetch.');
        }
        this.options.variables = __assign$10({}, this.options.variables, this.variables);
        var combinedOptions = __assign$10({}, this.options, { forceFetch: true });
        return this.queryManager.fetchQuery(this.queryId, combinedOptions, FetchType.refetch)
            .then(function (result) { return _this.queryManager.transformResult(result); });
    };
    ObservableQuery.prototype.fetchMore = function (fetchMoreOptions) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            var qid = _this.queryManager.generateQueryId();
            var combinedOptions = null;
            if (fetchMoreOptions.query) {
                combinedOptions = fetchMoreOptions;
            }
            else {
                var variables = __assign$10({}, _this.variables, fetchMoreOptions.variables);
                combinedOptions = __assign$10({}, _this.options, fetchMoreOptions, { variables: variables });
            }
            combinedOptions = __assign$10({}, combinedOptions, { query: combinedOptions.query, forceFetch: true });
            return _this.queryManager.fetchQuery(qid, combinedOptions);
        })
            .then(function (fetchMoreResult) {
            var reducer = fetchMoreOptions.updateQuery;
            var mapFn = function (previousResult, _a) {
                var variables = _a.variables;
                var queryVariables = variables;
                return reducer(previousResult, {
                    fetchMoreResult: fetchMoreResult,
                    queryVariables: queryVariables,
                });
            };
            _this.updateQuery(mapFn);
            return fetchMoreResult;
        });
    };
    ObservableQuery.prototype.subscribeToMore = function (options) {
        var _this = this;
        var observable = this.queryManager.startGraphQLSubscription({
            document: options.document,
            variables: options.variables,
        });
        var reducer = options.updateQuery;
        var subscription = observable.subscribe({
            next: function (data) {
                var mapFn = function (previousResult, _a) {
                    var variables = _a.variables;
                    return reducer(previousResult, {
                        subscriptionData: { data: data },
                        variables: variables,
                    });
                };
                _this.updateQuery(mapFn);
            },
            error: function (err) {
                if (options.onError) {
                    options.onError(err);
                }
                else {
                    console.error('Unhandled GraphQL subscription errror', err);
                }
            },
        });
        this.subscriptionHandles.push(subscription);
        return function () {
            var i = _this.subscriptionHandles.indexOf(subscription);
            if (i >= 0) {
                _this.subscriptionHandles.splice(i, 1);
                subscription.unsubscribe();
            }
        };
    };
    ObservableQuery.prototype.setOptions = function (opts) {
        var _this = this;
        var oldOptions = this.options;
        this.options = __assign$10({}, this.options, opts);
        if (opts.pollInterval) {
            this.startPolling(opts.pollInterval);
        }
        else if (opts.pollInterval === 0) {
            this.stopPolling();
        }
        if ((!oldOptions.forceFetch && opts.forceFetch) || (oldOptions.noFetch && !opts.noFetch)) {
            return this.queryManager.fetchQuery(this.queryId, this.options)
                .then(function (result) { return _this.queryManager.transformResult(result); });
        }
        return this.setVariables(this.options.variables);
    };
    ObservableQuery.prototype.setVariables = function (variables) {
        var _this = this;
        var newVariables = __assign$10({}, this.variables, variables);
        if (isEqual(newVariables, this.variables)) {
            return this.result();
        }
        else {
            this.variables = newVariables;
            return this.queryManager.fetchQuery(this.queryId, __assign$10({}, this.options, { variables: this.variables }))
                .then(function (result) { return _this.queryManager.transformResult(result); });
        }
    };
    ObservableQuery.prototype.updateQuery = function (mapFn) {
        var _a = this.queryManager.getQueryWithPreviousResult(this.queryId), previousResult = _a.previousResult, variables = _a.variables, document = _a.document;
        var newResult = tryFunctionOrLogError(function () { return mapFn(previousResult, { variables: variables }); });
        if (newResult) {
            this.queryManager.store.dispatch({
                type: 'APOLLO_UPDATE_QUERY_RESULT',
                newResult: newResult,
                variables: variables,
                document: document,
            });
        }
    };
    ObservableQuery.prototype.stopPolling = function () {
        if (this.isCurrentlyPolling) {
            this.scheduler.stopPollingQuery(this.queryId);
            this.isCurrentlyPolling = false;
        }
    };
    ObservableQuery.prototype.startPolling = function (pollInterval) {
        if (this.options.noFetch) {
            throw new Error('noFetch option should not use query polling.');
        }
        if (this.isCurrentlyPolling) {
            this.scheduler.stopPollingQuery(this.queryId);
            this.isCurrentlyPolling = false;
        }
        this.options.pollInterval = pollInterval;
        this.isCurrentlyPolling = true;
        this.scheduler.startPollingQuery(this.options, this.queryId);
    };
    ObservableQuery.prototype.onSubscribe = function (observer) {
        var _this = this;
        this.observers.push(observer);
        if (observer.next && this.lastResult) {
            observer.next(this.lastResult);
        }
        if (observer.error && this.lastError) {
            observer.error(this.lastError);
        }
        if (this.observers.length === 1) {
            this.setUpQuery();
        }
        var retQuerySubscription = {
            unsubscribe: function () {
                if (_this.observers.findIndex(function (el) { return el === observer; }) < 0) {
                    return;
                }
                _this.observers = _this.observers.filter(function (obs) { return obs !== observer; });
                if (_this.observers.length === 0) {
                    _this.tearDownQuery();
                }
            },
        };
        return retQuerySubscription;
    };
    ObservableQuery.prototype.setUpQuery = function () {
        var _this = this;
        if (this.shouldSubscribe) {
            this.queryManager.addObservableQuery(this.queryId, this);
        }
        if (!!this.options.pollInterval) {
            if (this.options.noFetch) {
                throw new Error('noFetch option should not use query polling.');
            }
            this.isCurrentlyPolling = true;
            this.scheduler.startPollingQuery(this.options, this.queryId);
        }
        var observer = {
            next: function (result) {
                _this.lastResult = result;
                _this.observers.forEach(function (obs) {
                    if (obs.next) {
                        obs.next(result);
                    }
                });
            },
            error: function (error) {
                _this.observers.forEach(function (obs) {
                    if (obs.error) {
                        obs.error(error);
                    }
                    else {
                        console.error('Unhandled error', error.message, error.stack);
                    }
                });
                _this.lastError = error;
            },
        };
        this.queryManager.startQuery(this.queryId, this.options, this.queryManager.queryListenerForObserver(this.queryId, this.options, observer));
    };
    ObservableQuery.prototype.tearDownQuery = function () {
        if (this.isCurrentlyPolling) {
            this.scheduler.stopPollingQuery(this.queryId);
            this.isCurrentlyPolling = false;
        }
        this.subscriptionHandles.forEach(function (sub) { return sub.unsubscribe(); });
        this.subscriptionHandles = [];
        this.queryManager.stopQuery(this.queryId);
        if (this.shouldSubscribe) {
            this.queryManager.removeObservableQuery(this.queryId);
        }
        this.observers = [];
    };
    return ObservableQuery;
}(Observable));

var __assign$11 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
var ID_KEY = typeof Symbol !== 'undefined' ? Symbol('id') : '@@id';
function readQueryFromStore(_a) {
    var _b = _a.returnPartialData, returnPartialData = _b === void 0 ? false : _b, options = __rest(_a, ["returnPartialData"]);
    return diffQueryAgainstStore(__assign$11({}, options, { returnPartialData: returnPartialData })).result;
}
var haveWarned = false;
var fragmentMatcher = function (idValue, typeCondition, context) {
    assertIdValue(idValue);
    var obj = context.store[idValue.id];
    if (!obj) {
        return false;
    }
    if (!obj.__typename) {
        if (!haveWarned) {
            console.warn("You're using fragments in your queries, but don't have the addTypename:\ntrue option set in Apollo Client. Please turn on that option so that we can accurately\nmatch fragments.");
            if (process.env.NODE_ENV !== 'test') {
                haveWarned = true;
            }
        }
        context.returnPartialData = true;
        return true;
    }
    if (obj.__typename === typeCondition) {
        return true;
    }
    context.returnPartialData = true;
    return false;
};
var readStoreResolver = function (fieldName, idValue, args, context, _a) {
    var resultKey = _a.resultKey;
    assertIdValue(idValue);
    var objId = idValue.id;
    var obj = context.store[objId];
    var storeKeyName = storeKeyNameFromFieldNameAndArgs(fieldName, args);
    var fieldValue = (obj || {})[storeKeyName];
    if (typeof fieldValue === 'undefined') {
        if (context.customResolvers && obj && (obj.__typename || objId === 'ROOT_QUERY')) {
            var typename = obj.__typename || 'Query';
            var type = context.customResolvers[typename];
            if (type) {
                var resolver = type[fieldName];
                if (resolver) {
                    return resolver(obj, args);
                }
            }
        }
        if (!context.returnPartialData) {
            throw new Error("Can't find field " + storeKeyName + " on object (" + objId + ") " + JSON.stringify(obj, null, 2) + ".\nPerhaps you want to use the `returnPartialData` option?");
        }
        context.hasMissingField = true;
        return fieldValue;
    }
    if (isJsonValue(fieldValue)) {
        if (idValue.previousResult && isEqual(idValue.previousResult[resultKey], fieldValue.json)) {
            return idValue.previousResult[resultKey];
        }
        return fieldValue.json;
    }
    if (idValue.previousResult) {
        fieldValue = addPreviousResultToIdValues(fieldValue, idValue.previousResult[resultKey]);
    }
    return fieldValue;
};
function diffQueryAgainstStore(_a) {
    var store = _a.store, query = _a.query, variables = _a.variables, _b = _a.returnPartialData, returnPartialData = _b === void 0 ? true : _b, previousResult = _a.previousResult, config = _a.config;
    getQueryDefinition(query);
    var context = {
        store: store,
        returnPartialData: returnPartialData,
        customResolvers: config && config.customResolvers,
        hasMissingField: false,
    };
    var rootIdValue = {
        type: 'id',
        id: 'ROOT_QUERY',
        previousResult: previousResult,
    };
    var result = graphqlAnywhere(readStoreResolver, query, rootIdValue, context, variables, {
        fragmentMatcher: fragmentMatcher,
        resultMapper: resultMapper,
    });
    return {
        result: result,
        isMissing: context.hasMissingField,
    };
}
function assertIdValue(idValue) {
    if (!isIdValue(idValue)) {
        throw new Error("Encountered a sub-selection on the query, but the store doesn't have an object reference. This should never happen during normal use unless you have custom code that is directly manipulating the store; please file an issue.");
    }
}
function addPreviousResultToIdValues(value, previousResult) {
    if (isIdValue(value)) {
        return __assign$11({}, value, { previousResult: previousResult });
    }
    else if (Array.isArray(value)) {
        var idToPreviousResult_1 = {};
        if (Array.isArray(previousResult)) {
            previousResult.forEach(function (item) {
                if (item[ID_KEY]) {
                    idToPreviousResult_1[item[ID_KEY]] = item;
                }
            });
        }
        return value.map(function (item, i) {
            var itemPreviousResult = previousResult && previousResult[i];
            if (isIdValue(item)) {
                itemPreviousResult = idToPreviousResult_1[item.id] || itemPreviousResult;
            }
            return addPreviousResultToIdValues(item, itemPreviousResult);
        });
    }
    return value;
}
function resultMapper(resultFields, idValue) {
    if (idValue.previousResult) {
        var currentResultKeys_1 = Object.keys(resultFields);
        var sameAsPreviousResult = Object.keys(idValue.previousResult)
            .reduce(function (sameKeys, key) { return sameKeys && currentResultKeys_1.indexOf(key) > -1; }, true) &&
            currentResultKeys_1.reduce(function (same, key) { return (same && areNestedArrayItemsStrictlyEqual(resultFields[key], idValue.previousResult[key])); }, true);
        if (sameAsPreviousResult) {
            return idValue.previousResult;
        }
    }
    Object.defineProperty(resultFields, ID_KEY, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: idValue.id,
    });
    return resultFields;
}
function areNestedArrayItemsStrictlyEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    return a.reduce(function (same, item, i) { return same && areNestedArrayItemsStrictlyEqual(item, b[i]); }, true);
}

var Deduplicator = (function () {
    function Deduplicator(networkInterface) {
        this.networkInterface = networkInterface;
        this.inFlightRequestPromises = {};
    }
    Deduplicator.prototype.query = function (request, deduplicate) {
        var _this = this;
        if (deduplicate === void 0) { deduplicate = true; }
        if (!deduplicate) {
            return this.networkInterface.query(request);
        }
        var key = this.getKey(request);
        if (!this.inFlightRequestPromises[key]) {
            this.inFlightRequestPromises[key] = this.networkInterface.query(request);
        }
        return this.inFlightRequestPromises[key]
            .then(function (res) {
            delete _this.inFlightRequestPromises[key];
            return res;
        });
    };
    Deduplicator.prototype.getKey = function (request) {
        return graphqlTag_printer.print(request.query) + "|" + JSON.stringify(request.variables) + "|" + request.operationName;
    };
    return Deduplicator;
}());

var TYPENAME_FIELD = {
    kind: 'Field',
    alias: null,
    name: {
        kind: 'Name',
        value: '__typename',
    },
};
function addTypenameToSelectionSet(selectionSet, isRoot) {
    if (isRoot === void 0) { isRoot = false; }
    if (selectionSet && selectionSet.selections) {
        if (!isRoot) {
            var alreadyHasThisField = selectionSet.selections.some(function (selection) {
                return selection.kind === 'Field' && selection.name.value === '__typename';
            });
            if (!alreadyHasThisField) {
                selectionSet.selections.push(TYPENAME_FIELD);
            }
        }
        selectionSet.selections.forEach(function (selection) {
            if (selection.kind === 'Field' || selection.kind === 'InlineFragment') {
                addTypenameToSelectionSet(selection.selectionSet);
            }
        });
    }
}
function addTypenameToDocument(doc) {
    checkDocument(doc);
    var docClone = cloneDeep(doc);
    docClone.definitions.forEach(function (definition) {
        var isRoot = definition.kind === 'OperationDefinition';
        addTypenameToSelectionSet(definition.selectionSet, isRoot);
    });
    return docClone;
}

function createStoreReducer(resultReducer, document, variables, config) {
    return function (store, action) {
        var currentResult = readQueryFromStore({
            store: store,
            query: document,
            variables: variables,
            returnPartialData: true,
            config: config,
        });
        var nextResult = resultReducer(currentResult, action, variables);
        if (currentResult !== nextResult) {
            return writeResultToStore({
                dataId: 'ROOT_QUERY',
                result: nextResult,
                store: store,
                document: document,
                variables: variables,
                dataIdFromObject: config.dataIdFromObject,
            });
        }
        return store;
    };
}

function deepFreeze(o) {
    Object.freeze(o);
    Object.getOwnPropertyNames(o).forEach(function (prop) {
        if (o.hasOwnProperty(prop)
            && o[prop] !== null
            && (typeof o[prop] === 'object' || typeof o[prop] === 'function')
            && !Object.isFrozen(o[prop])) {
            deepFreeze(o[prop]);
        }
    });
    return o;
}

function maybeDeepFreeze(obj) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return deepFreeze(obj);
    }
    return obj;
}

var __assign$14 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var QueryScheduler = (function () {
    function QueryScheduler(_a) {
        var queryManager = _a.queryManager;
        this.queryManager = queryManager;
        this.pollingTimers = {};
        this.inFlightQueries = {};
        this.registeredQueries = {};
        this.intervalQueries = {};
    }
    QueryScheduler.prototype.checkInFlight = function (queryId) {
        var queries$$1 = this.queryManager.getApolloState().queries;
        return queries$$1[queryId] && queries$$1[queryId].networkStatus !== exports.NetworkStatus.ready;
    };
    QueryScheduler.prototype.fetchQuery = function (queryId, options, fetchType) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.queryManager.fetchQuery(queryId, options, fetchType).then(function (result) {
                resolve(result);
            }).catch(function (error) {
                reject(error);
            });
        });
    };
    QueryScheduler.prototype.startPollingQuery = function (options, queryId, listener) {
        if (!options.pollInterval) {
            throw new Error('Attempted to start a polling query without a polling interval.');
        }
        this.registeredQueries[queryId] = options;
        if (listener) {
            this.queryManager.addQueryListener(queryId, listener);
        }
        this.addQueryOnInterval(queryId, options);
        return queryId;
    };
    QueryScheduler.prototype.stopPollingQuery = function (queryId) {
        delete this.registeredQueries[queryId];
    };
    QueryScheduler.prototype.fetchQueriesOnInterval = function (interval) {
        var _this = this;
        this.intervalQueries[interval] = this.intervalQueries[interval].filter(function (queryId) {
            if (!_this.registeredQueries.hasOwnProperty(queryId)) {
                return false;
            }
            if (_this.checkInFlight(queryId)) {
                return true;
            }
            var queryOptions = _this.registeredQueries[queryId];
            var pollingOptions = __assign$14({}, queryOptions);
            pollingOptions.forceFetch = true;
            _this.fetchQuery(queryId, pollingOptions, FetchType.poll);
            return true;
        });
        if (this.intervalQueries[interval].length === 0) {
            clearInterval(this.pollingTimers[interval]);
            delete this.intervalQueries[interval];
        }
    };
    QueryScheduler.prototype.addQueryOnInterval = function (queryId, queryOptions) {
        var _this = this;
        var interval = queryOptions.pollInterval;
        if (this.intervalQueries.hasOwnProperty(interval.toString()) && this.intervalQueries[interval].length > 0) {
            this.intervalQueries[interval].push(queryId);
        }
        else {
            this.intervalQueries[interval] = [queryId];
            this.pollingTimers[interval] = setInterval(function () {
                _this.fetchQueriesOnInterval(interval);
            }, interval);
        }
    };
    QueryScheduler.prototype.registerPollingQuery = function (queryOptions) {
        if (!queryOptions.pollInterval) {
            throw new Error('Attempted to register a non-polling query with the scheduler.');
        }
        return new ObservableQuery({
            scheduler: this,
            options: queryOptions,
        });
    };
    return QueryScheduler;
}());

var __assign$13 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var QueryManager = (function () {
    function QueryManager(_a) {
        var networkInterface = _a.networkInterface, store = _a.store, reduxRootSelector = _a.reduxRootSelector, _b = _a.reducerConfig, reducerConfig = _b === void 0 ? { mutationBehaviorReducers: {} } : _b, resultTransformer = _a.resultTransformer, resultComparator = _a.resultComparator, _c = _a.addTypename, addTypename = _c === void 0 ? true : _c, _d = _a.queryDeduplication, queryDeduplication = _d === void 0 ? false : _d;
        var _this = this;
        this.idCounter = 1;
        this.networkInterface = networkInterface;
        this.deduplicator = new Deduplicator(networkInterface);
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
        this.scheduler = new QueryScheduler({
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
                if (isEqual(previousStoreData, currentStoreData_1) && previousStoreHasData) {
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
            mutation = addTypenameToDocument(mutation);
        }
        checkDocument(mutation);
        var mutationString = graphqlTag_printer.print(mutation);
        var request = {
            query: mutation,
            variables: variables,
            operationName: getOperationName(mutation),
        };
        var updateQueriesResultBehaviors = !optimisticResponse ? [] :
            this.collectResultBehaviorsFromUpdateQueries(updateQueries, { data: optimisticResponse }, true);
        this.queryDocuments[mutationId] = mutation;
        this.store.dispatch({
            type: 'APOLLO_MUTATION_INIT',
            mutationString: mutationString,
            mutation: mutation,
            variables: variables,
            operationName: getOperationName(mutation),
            mutationId: mutationId,
            optimisticResponse: optimisticResponse,
            resultBehaviors: resultBehaviors.concat(updateQueriesResultBehaviors),
            extraReducers: this.getExtraReducers(),
        });
        return new Promise(function (resolve, reject) {
            _this.networkInterface.query(request)
                .then(function (result) {
                if (result.errors) {
                    reject(new ApolloError({
                        graphQLErrors: result.errors,
                    }));
                }
                _this.store.dispatch({
                    type: 'APOLLO_MUTATION_RESULT',
                    result: result,
                    mutationId: mutationId,
                    document: mutation,
                    operationName: getOperationName(mutation),
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
                reject(new ApolloError({
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
                    var apolloError = new ApolloError({
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
                            data: readQueryFromStore({
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
                                    observer.next(maybeDeepFreeze(_this.transformResult(resultFromStore)));
                                }
                                catch (e) {
                                    console.error("Error in observer.next \n" + e.stack);
                                }
                            }
                        }
                    }
                    catch (error) {
                        if (observer.error) {
                            observer.error(new ApolloError({
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
        getQueryDefinition(options.query);
        var transformedOptions = __assign$13({}, options);
        if (this.addTypename) {
            transformedOptions.query = addTypenameToDocument(transformedOptions.query);
        }
        var observableQuery = new ObservableQuery({
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
        var queryString = graphqlTag_printer.print(queryDoc);
        var storeResult;
        var needToFetch = forceFetch;
        if (!forceFetch) {
            var _f = diffQueryAgainstStore({
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
            isPoll: fetchType === FetchType.poll,
            isRefetch: fetchType === FetchType.refetch,
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
        return getDataWithOptimisticResults(this.getApolloState());
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
        var queryDef = getQueryDefinition(observableQuery.options.query);
        if (queryDef.name && queryDef.name.value) {
            var queryName = queryDef.name.value;
            this.queryIdsByName[queryName] = this.queryIdsByName[queryName] || [];
            this.queryIdsByName[queryName].push(observableQuery.queryId);
        }
    };
    QueryManager.prototype.removeObservableQuery = function (queryId) {
        var observableQuery = this.observableQueries[queryId].observableQuery;
        var definition = getQueryDefinition(observableQuery.options.query);
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
            transformedDoc = addTypenameToDocument(transformedDoc);
        }
        var request = {
            query: transformedDoc,
            variables: variables,
            operationName: getOperationName(transformedDoc),
        };
        var subId;
        var observers = [];
        return new Observable(function (observer) {
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
                            operationName: getOperationName(transformedDoc),
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
            var data = readQueryFromStore(readOptions);
            return maybeDeepFreeze({ data: data, partial: false });
        }
        catch (e) {
            if (queryOptions.returnPartialData || queryOptions.noFetch) {
                try {
                    readOptions.returnPartialData = true;
                    var data = readQueryFromStore(readOptions);
                    return { data: data, partial: true };
                }
                catch (e) {
                }
            }
            return maybeDeepFreeze({ data: {}, partial: true });
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
            transformedDoc = addTypenameToDocument(transformedDoc);
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
                var newResult = tryFunctionOrLogError(function () { return reducer(previousResult, {
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
            queryDoc = addTypenameToDocument(queryDoc);
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
                return createStoreReducer(queryOptions.reducer, queryOptions.query, queryOptions.variables, _this.reducerConfig);
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
            operationName: getOperationName(document),
        };
        var retPromise = new Promise(function (resolve, reject) {
            _this.addFetchQueryPromise(requestId, retPromise, resolve, reject);
            _this.deduplicator.query(request, _this.queryDeduplication)
                .then(function (result) {
                var extraReducers = _this.getExtraReducers();
                _this.store.dispatch({
                    type: 'APOLLO_QUERY_RESULT',
                    document: document,
                    operationName: getOperationName(document),
                    result: result,
                    queryId: queryId,
                    requestId: requestId,
                    extraReducers: extraReducers,
                });
                _this.removeFetchQueryPromise(requestId);
                if (result.errors) {
                    throw new ApolloError({
                        graphQLErrors: result.errors,
                    });
                }
                return result;
            }).then(function () {
                var resultFromStore;
                try {
                    resultFromStore = readQueryFromStore({
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
                resolve({ data: resultFromStore, loading: false, networkStatus: exports.NetworkStatus.ready });
                return null;
            }).catch(function (error) {
                if (isApolloError(error)) {
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
                    reject(new ApolloError({
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
        var queries$$1 = this.getApolloState().queries;
        Object.keys(this.queryListeners).forEach(function (queryId) {
            var listeners = _this.queryListeners[queryId];
            if (listeners) {
                listeners.forEach(function (listener) {
                    if (listener) {
                        var queryStoreValue = queries$$1[queryId];
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

var version = 'local';

var __assign$12 = (undefined && undefined.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var DEFAULT_REDUX_ROOT_KEY = 'apollo';
function defaultReduxRootSelector(state) {
    return state[DEFAULT_REDUX_ROOT_KEY];
}
var ApolloClient$1 = (function () {
    function ApolloClient(_a) {
        var _b = _a === void 0 ? {} : _a, networkInterface = _b.networkInterface, reduxRootKey = _b.reduxRootKey, reduxRootSelector = _b.reduxRootSelector, initialState = _b.initialState, dataIdFromObject = _b.dataIdFromObject, resultComparator = _b.resultComparator, _c = _b.ssrMode, ssrMode = _c === void 0 ? false : _c, _d = _b.ssrForceFetchDelay, ssrForceFetchDelay = _d === void 0 ? 0 : _d, _e = _b.mutationBehaviorReducers, mutationBehaviorReducers = _e === void 0 ? {} : _e, _f = _b.addTypename, addTypename = _f === void 0 ? true : _f, resultTransformer = _b.resultTransformer, customResolvers = _b.customResolvers, connectToDevTools = _b.connectToDevTools, _g = _b.queryDeduplication, queryDeduplication = _g === void 0 ? false : _g;
        var _this = this;
        this.middleware = function () {
            return function (store) {
                _this.setStore(store);
                return function (next) { return function (action) {
                    var previousApolloState = _this.queryManager.selectApolloState(store);
                    var returnValue = next(action);
                    var newApolloState = _this.queryManager.selectApolloState(store);
                    if (newApolloState !== previousApolloState) {
                        _this.queryManager.broadcastNewStore(store.getState());
                    }
                    if (_this.devToolsHookCb) {
                        _this.devToolsHookCb({
                            action: action,
                            state: _this.queryManager.getApolloState(),
                            dataWithOptimisticResults: _this.queryManager.getDataWithOptimisticResults(),
                        });
                    }
                    return returnValue;
                }; };
            };
        };
        if (reduxRootKey && reduxRootSelector) {
            throw new Error('Both "reduxRootKey" and "reduxRootSelector" are configured, but only one of two is allowed.');
        }
        if (reduxRootKey) {
            console.warn('"reduxRootKey" option is deprecated and might be removed in the upcoming versions, ' +
                'please use the "reduxRootSelector" instead.');
            this.reduxRootKey = reduxRootKey;
        }
        if (!reduxRootSelector && reduxRootKey) {
            this.reduxRootSelector = function (state) { return state[reduxRootKey]; };
        }
        else if (typeof reduxRootSelector === 'string') {
            this.reduxRootKey = reduxRootSelector;
            this.reduxRootSelector = function (state) { return state[reduxRootSelector]; };
        }
        else if (typeof reduxRootSelector === 'function') {
            this.reduxRootSelector = reduxRootSelector;
        }
        else {
            this.reduxRootSelector = null;
        }
        this.initialState = initialState ? initialState : {};
        this.networkInterface = networkInterface ? networkInterface :
            createNetworkInterface({ uri: '/graphql' });
        this.addTypename = addTypename;
        if (resultTransformer) {
            console.warn('"resultTransformer" is being considered for deprecation in an upcoming version. ' +
                'If you are using it, please file an issue on apollostack/apollo-client ' +
                'with a description of your use-case');
        }
        this.resultTransformer = resultTransformer;
        this.resultComparator = resultComparator;
        this.shouldForceFetch = !(ssrMode || ssrForceFetchDelay > 0);
        this.dataId = dataIdFromObject;
        this.fieldWithArgs = storeKeyNameFromFieldNameAndArgs;
        this.queryDeduplication = queryDeduplication;
        if (ssrForceFetchDelay) {
            setTimeout(function () { return _this.shouldForceFetch = true; }, ssrForceFetchDelay);
        }
        this.reducerConfig = {
            dataIdFromObject: dataIdFromObject,
            mutationBehaviorReducers: mutationBehaviorReducers,
            customResolvers: customResolvers,
        };
        this.watchQuery = this.watchQuery.bind(this);
        this.query = this.query.bind(this);
        this.mutate = this.mutate.bind(this);
        this.setStore = this.setStore.bind(this);
        this.resetStore = this.resetStore.bind(this);
        var defaultConnectToDevTools = typeof process === 'undefined' || (process.env && process.env.NODE_ENV !== 'production') &&
            typeof window !== 'undefined' && (!window.__APOLLO_CLIENT__);
        if (typeof connectToDevTools === 'undefined') {
            connectToDevTools = defaultConnectToDevTools;
        }
        if (connectToDevTools) {
            window.__APOLLO_CLIENT__ = this;
        }
        this.version = version;
    }
    ApolloClient.prototype.watchQuery = function (options) {
        this.initStore();
        if (!this.shouldForceFetch && options.forceFetch) {
            options = __assign$12({}, options, { forceFetch: false });
        }
        return this.queryManager.watchQuery(options);
    };
    
    ApolloClient.prototype.query = function (options) {
        this.initStore();
        if (!this.shouldForceFetch && options.forceFetch) {
            options = __assign$12({}, options, { forceFetch: false });
        }
        return this.queryManager.query(options);
    };
    
    ApolloClient.prototype.mutate = function (options) {
        this.initStore();
        return this.queryManager.mutate(options);
    };
    
    ApolloClient.prototype.subscribe = function (options) {
        this.initStore();
        var realOptions = __assign$12({}, options, { document: options.query });
        delete realOptions.query;
        return this.queryManager.startGraphQLSubscription(realOptions);
    };
    ApolloClient.prototype.reducer = function () {
        return createApolloReducer(this.reducerConfig);
    };
    ApolloClient.prototype.__actionHookForDevTools = function (cb) {
        this.devToolsHookCb = cb;
    };
    ApolloClient.prototype.initStore = function () {
        var _this = this;
        if (this.store) {
            return;
        }
        if (this.reduxRootSelector) {
            throw new Error('Cannot initialize the store because "reduxRootSelector" or "reduxRootKey" is provided. ' +
                'They should only be used when the store is created outside of the client. ' +
                'This may lead to unexpected results when querying the store internally. ' +
                "Please remove that option from ApolloClient constructor.");
        }
        this.setStore(createApolloStore({
            reduxRootKey: DEFAULT_REDUX_ROOT_KEY,
            initialState: this.initialState,
            config: this.reducerConfig,
            logger: function (store) { return function (next) { return function (action) {
                var result = next(action);
                if (_this.devToolsHookCb) {
                    _this.devToolsHookCb({
                        action: action,
                        state: _this.queryManager.getApolloState(),
                        dataWithOptimisticResults: _this.queryManager.getDataWithOptimisticResults(),
                    });
                }
                return result;
            }; }; },
        }));
        this.reduxRootKey = DEFAULT_REDUX_ROOT_KEY;
    };
    
    ApolloClient.prototype.resetStore = function () {
        this.queryManager.resetStore();
    };
    
    ApolloClient.prototype.getInitialState = function () {
        return this.queryManager.getInitialState();
    };
    ApolloClient.prototype.setStore = function (store) {
        var reduxRootSelector;
        if (this.reduxRootSelector) {
            reduxRootSelector = this.reduxRootSelector;
        }
        else {
            reduxRootSelector = defaultReduxRootSelector;
            this.reduxRootKey = DEFAULT_REDUX_ROOT_KEY;
        }
        if (typeof reduxRootSelector(store.getState()) === 'undefined') {
            throw new Error('Existing store does not use apolloReducer. Please make sure the store ' +
                'is properly configured and "reduxRootSelector" is correctly specified.');
        }
        this.store = store;
        this.queryManager = new QueryManager({
            networkInterface: this.networkInterface,
            reduxRootSelector: reduxRootSelector,
            store: store,
            addTypename: this.addTypename,
            resultTransformer: this.resultTransformer,
            resultComparator: this.resultComparator,
            reducerConfig: this.reducerConfig,
            queryDeduplication: this.queryDeduplication,
        });
    };
    
    return ApolloClient;
}());

exports.createNetworkInterface = createNetworkInterface;
exports.createBatchingNetworkInterface = createBatchingNetworkInterface;
exports.createApolloStore = createApolloStore;
exports.createApolloReducer = createApolloReducer;
exports.readQueryFromStore = readQueryFromStore;
exports.writeQueryToStore = writeQueryToStore;
exports.printAST = graphqlTag_printer.print;
exports.createFragmentMap = createFragmentMap;
exports.ApolloError = ApolloError;
exports.getQueryDefinition = getQueryDefinition;
exports.getFragmentDefinitions = getFragmentDefinitions;
exports.toIdValue = toIdValue;
exports.HTTPFetchNetworkInterface = HTTPFetchNetworkInterface;
exports.ObservableQuery = ObservableQuery;
exports.ApolloClient = ApolloClient$1;
exports['default'] = ApolloClient$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=apollo.umd.js.map