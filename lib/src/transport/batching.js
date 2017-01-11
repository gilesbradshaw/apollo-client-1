"use strict";
;
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
exports.QueryBatcher = QueryBatcher;
//# sourceMappingURL=batching.js.map