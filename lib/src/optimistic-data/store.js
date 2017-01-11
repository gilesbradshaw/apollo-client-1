"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var actions_1 = require("../actions");
var store_1 = require("../data/store");
var assign_1 = require("../util/assign");
var optimisticDefaultState = [];
function getDataWithOptimisticResults(store) {
    if (store.optimistic.length === 0) {
        return store.data;
    }
    var patches = store.optimistic.map(function (opt) { return opt.data; });
    return assign_1.assign.apply(void 0, [{}, store.data].concat(patches));
}
exports.getDataWithOptimisticResults = getDataWithOptimisticResults;
function optimistic(previousState, action, store, config) {
    if (previousState === void 0) { previousState = optimisticDefaultState; }
    if (actions_1.isMutationInitAction(action) && action.optimisticResponse) {
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
        var fakeStore = __assign({}, store, { optimistic: previousState });
        var optimisticData_1 = getDataWithOptimisticResults(fakeStore);
        var fakeDataResultState_1 = store_1.data(optimisticData_1, fakeMutationResultAction, store.queries, store.mutations, config);
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
    else if ((actions_1.isMutationErrorAction(action) || actions_1.isMutationResultAction(action))
        && previousState.some(function (change) { return change.mutationId === action.mutationId; })) {
        var newState = previousState.filter(function (change) { return change.mutationId !== action.mutationId; });
        return newState;
    }
    return previousState;
}
exports.optimistic = optimistic;
//# sourceMappingURL=store.js.map