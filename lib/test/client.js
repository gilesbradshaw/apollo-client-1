"use strict";
var chai = require("chai");
var assert = chai.assert;
var sinon = require("sinon");
var src_1 = require("../src");
var graphql_tag_1 = require("graphql-tag");
var redux_todomvc_1 = require("./fixtures/redux-todomvc");
var graphql_tag_2 = require("graphql-tag");
var printer_1 = require("graphql-tag/printer");
var store_1 = require("../src/queries/store");
var redux_1 = require("redux");
var networkInterface_1 = require("../src/transport/networkInterface");
var batchedNetworkInterface_1 = require("../src/transport/batchedNetworkInterface");
var mockNetworkInterface_1 = require("./mocks/mockNetworkInterface");
var mockFetch_1 = require("./mocks/mockFetch");
var chaiAsPromised = require("chai-as-promised");
var wrap_1 = require("./util/wrap");
var lodash_1 = require("lodash");
chai.use(chaiAsPromised);
graphql_tag_1.disableFragmentWarnings();
describe('client', function () {
    it('does not require any arguments and creates store lazily', function () {
        var client = new src_1.default();
        assert.isUndefined(client.store);
        client.initStore();
        assert.isDefined(client.store);
        assert.isDefined(client.store.getState().apollo);
    });
    it('can be loaded via require', function () {
        var ApolloClientRequire = require('../src').default;
        var client = new ApolloClientRequire();
        assert.isUndefined(client.store);
        client.initStore();
        assert.isDefined(client.store);
        assert.isDefined(client.store.getState().apollo);
    });
    it('can allow passing in a network interface', function () {
        var networkInterface = networkInterface_1.createNetworkInterface({ uri: 'swapi' });
        var client = new src_1.default({
            networkInterface: networkInterface,
        });
        assert.equal(client.networkInterface._uri, networkInterface._uri);
    });
    it('can allow passing in a store', function () {
        var client = new src_1.default();
        var store = redux_1.createStore(redux_1.combineReducers({
            todos: redux_todomvc_1.rootReducer,
            apollo: client.reducer(),
        }), redux_1.applyMiddleware(client.middleware()));
        assert.deepEqual(client.store.getState(), store.getState());
    });
    it('throws an error if you pass in a store without apolloReducer', function () {
        try {
            var client = new src_1.default();
            redux_1.createStore(redux_1.combineReducers({
                todos: redux_todomvc_1.rootReducer,
            }), redux_1.applyMiddleware(client.middleware()));
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Existing store does not use apolloReducer. Please make sure the store ' +
                'is properly configured and "reduxRootSelector" is correctly specified.');
        }
    });
    it('has a top level key by default', function () {
        var client = new src_1.default();
        client.initStore();
        assert.deepEqual(client.store.getState(), {
            apollo: {
                queries: {},
                mutations: {},
                data: {},
                optimistic: [],
                reducerError: null,
            },
        });
    });
    it('sets reduxRootKey by default (backcompat)', function () {
        var client = new src_1.default();
        client.initStore();
        assert.equal(client.reduxRootKey, 'apollo');
    });
    it('sets reduxRootKey if you use ApolloClient as middleware', function () {
        var client = new src_1.default();
        redux_1.createStore(redux_1.combineReducers({
            apollo: client.reducer(),
        }), redux_1.applyMiddleware(client.middleware()));
        assert.equal(client.reduxRootKey, 'apollo');
    });
    it('can allow passing in a top level key (backcompat)', function () {
        wrap_1.withWarning(function () {
            var reduxRootKey = 'testApollo';
            var client = new src_1.default({
                reduxRootKey: reduxRootKey,
            });
            redux_1.createStore(redux_1.combineReducers({
                testApollo: client.reducer(),
            }), redux_1.applyMiddleware(client.middleware()));
            assert.equal(client.reduxRootKey, 'testApollo');
        }, /reduxRootKey/);
    });
    it('should allow passing in a selector function for apollo state', function () {
        var reduxRootSelector = function (state) { return state.testApollo; };
        var client = new src_1.default({
            reduxRootSelector: reduxRootSelector,
        });
        redux_1.createStore(redux_1.combineReducers({
            testApollo: client.reducer(),
        }), redux_1.applyMiddleware(client.middleware()));
    });
    it('should allow passing reduxRootSelector as a string', function () {
        var reduxRootSelector = 'testApollo';
        var client = new src_1.default({
            reduxRootSelector: reduxRootSelector,
        });
        redux_1.createStore(redux_1.combineReducers({
            testApollo: client.reducer(),
        }), redux_1.applyMiddleware(client.middleware()));
        assert.equal(client.reduxRootKey, 'testApollo');
    });
    it('should throw an error if both "reduxRootKey" and "reduxRootSelector" are passed', function () {
        var reduxRootSelector = function (state) { return state.testApollo; };
        try {
            new src_1.default({
                reduxRootKey: 'apollo',
                reduxRootSelector: reduxRootSelector,
            });
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Both "reduxRootKey" and "reduxRootSelector" are configured, but only one of two is allowed.');
        }
    });
    it('should throw an error if "reduxRootKey" is provided and the client tries to create the store', function () {
        var client = wrap_1.withWarning(function () {
            return new src_1.default({
                reduxRootKey: 'test',
            });
        }, /reduxRootKey/);
        try {
            client.initStore();
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Cannot initialize the store because "reduxRootSelector" or "reduxRootKey" is provided. ' +
                'They should only be used when the store is created outside of the client. ' +
                'This may lead to unexpected results when querying the store internally. ' +
                "Please remove that option from ApolloClient constructor.");
        }
    });
    it('should throw an error if "reduxRootSelector" is provided and the client tries to create the store', function () {
        var reduxRootSelector = function (state) { return state.testApollo; };
        var client = new src_1.default({
            reduxRootSelector: reduxRootSelector,
        });
        try {
            client.initStore();
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Cannot initialize the store because "reduxRootSelector" or "reduxRootKey" is provided. ' +
                'They should only be used when the store is created outside of the client. ' +
                'This may lead to unexpected results when querying the store internally. ' +
                "Please remove that option from ApolloClient constructor.");
        }
    });
    it('should allow for a single query to take place', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        clientRoundrip(query, data);
        var _a;
    });
    it('should allow fragments on root query', function () {
        var query = (_a = ["\n      query {\n        ...QueryFragment\n        records {\n          id\n        }\n      }\n\n      fragment QueryFragment on Query {\n        records {\n          name\n        }\n      }\n    "], _a.raw = ["\n      query {\n        ...QueryFragment\n        records {\n          id\n        }\n      }\n\n      fragment QueryFragment on Query {\n        records {\n          name\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            records: [
                { id: 1, name: 'One' },
                { id: 2, name: 'Two' },
            ],
        };
        clientRoundrip(query, data);
        var _a;
    });
    it('should allow for a single query with existing store', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: data },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        redux_1.createStore(redux_1.combineReducers({
            todos: redux_todomvc_1.rootReducer,
            apollo: client.reducer(),
        }), redux_1.applyMiddleware(client.middleware()));
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
        });
        var _a;
    });
    it('store can be rehydrated from the server', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: data },
        });
        var initialState = {
            apollo: {
                data: {
                    'ROOT_QUERY.allPeople({"first":"1"}).people.0': {
                        name: 'Luke Skywalker',
                    },
                    'ROOT_QUERY.allPeople({"first":1})': {
                        people: [{
                                type: 'id',
                                generated: true,
                                id: 'ROOT_QUERY.allPeople({"first":"1"}).people.0',
                            }],
                    },
                    ROOT_QUERY: {
                        'allPeople({"first":1})': {
                            type: 'id',
                            id: 'ROOT_QUERY.allPeople({"first":1})',
                            generated: true,
                        },
                    },
                },
                optimistic: [],
            },
        };
        var finalState = { apollo: lodash_1.assign({}, initialState.apollo, {
                queries: {
                    '1': {
                        queryString: printer_1.print(query),
                        variables: {},
                        loading: false,
                        networkStatus: store_1.NetworkStatus.ready,
                        networkError: null,
                        graphQLErrors: null,
                        forceFetch: false,
                        returnPartialData: false,
                        lastRequestId: 2,
                        previousVariables: null,
                        metadata: null,
                    },
                },
                mutations: {},
                reducerError: null,
            }) };
        var client = new src_1.default({
            networkInterface: networkInterface,
            initialState: initialState,
            addTypename: false,
        });
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
            assert.deepEqual(finalState, client.store.getState());
        });
        var _a;
    });
    it('allows for a single query with existing store and custom key', function () {
        var reduxRootKey = 'test';
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: data },
        });
        var client = wrap_1.withWarning(function () {
            return new src_1.default({
                reduxRootKey: reduxRootKey,
                networkInterface: networkInterface,
                addTypename: false,
            });
        }, /reduxRootKey/);
        redux_1.createStore(redux_1.combineReducers((_b = {
                todos: redux_todomvc_1.rootReducer
            },
            _b[reduxRootKey] = client.reducer(),
            _b)), redux_1.applyMiddleware(client.middleware()));
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
        });
        var _a, _b;
    });
    it('should return errors correctly for a single query', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var errors = [
            {
                name: 'test',
                message: 'Syntax Error GraphQL request (8:9) Expected Name, found EOF',
            },
        ];
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { errors: errors },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query })
            .catch(function (error) {
            assert.deepEqual(error.graphQLErrors, errors);
        });
        var _a;
    });
    it('should not let errors in observer.next reach the store', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: data },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        var consoleDotError = console.error;
        console.error = function (err) {
            console.error = consoleDotError;
            if (err.match(/Error in observer.next/)) {
                done();
            }
            else {
                done(new Error('Expected error in observer.next to be caught'));
            }
        };
        handle.subscribe({
            next: function (result) {
                throw new Error('this error should not reach the store');
            },
        });
        var _a;
    });
    it('should not let errors in observer.error reach the store', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: {},
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        var consoleDotError = console.error;
        console.error = function (err) {
            console.error = consoleDotError;
            if (err.match(/Error in observer.error/)) {
                done();
            }
            else {
                done(new Error('Expected error in observer.error to be caught'));
            }
        };
        handle.subscribe({
            next: function () {
                done(new Error('did not expect next to be called'));
            },
            error: function (err) {
                throw new Error('this error should not reach the store');
            },
        });
        var _a;
    });
    it('should allow for subscribing to a request', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: data },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        handle.subscribe({
            next: function (result) {
                assert.deepEqual(result.data, data);
                done();
            },
        });
        var _a;
    });
    it('should be able to transform queries', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var transformedQuery = (_b = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], graphql_tag_2.default(_b));
        var result = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var transformedResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
                '__typename': 'Author',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: result },
        }, {
            request: { query: transformedQuery },
            result: { data: transformedResult },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: true,
        });
        client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, transformedResult);
            done();
        });
        var _a, _b;
    });
    it('should be able to transform queries on forced fetches', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var transformedQuery = (_b = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], graphql_tag_2.default(_b));
        var result = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var transformedResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
                '__typename': 'Author',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: result },
        }, {
            request: { query: transformedQuery },
            result: { data: transformedResult },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: true,
        });
        client.query({ forceFetch: true, query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, transformedResult);
            done();
        });
        var _a, _b;
    });
    it('should handle named fragments on mutations', function (done) {
        var mutation = (_a = ["\n      mutation {\n        starAuthor(id: 12) {\n          author {\n            ...authorDetails\n          }\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], _a.raw = ["\n      mutation {\n        starAuthor(id: 12) {\n          author {\n            ...authorDetails\n          }\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], graphql_tag_2.default(_a));
        var result = {
            'starAuthor': {
                'author': {
                    'firstName': 'John',
                    'lastName': 'Smith',
                },
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: mutation },
            result: { data: result },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
            done();
        });
        var _a;
    });
    it('should be able to handle named fragments on forced fetches', function () {
        var query = (_a = ["\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }"], _a.raw = ["\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }"], graphql_tag_2.default(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: result },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ forceFetch: true, query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle named fragments with multiple fragments', function () {
        var query = (_a = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n          ...moreDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      fragment moreDetails on Author {\n        address\n      }"], _a.raw = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n          ...moreDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      fragment moreDetails on Author {\n        address\n      }"], graphql_tag_2.default(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
                'address': '1337 10th St.',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: result },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle named fragments', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], _a.raw = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], graphql_tag_2.default(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: query },
            result: { data: result },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
            done();
        });
        var _a;
    });
    it('should send operationName along with the query to the server', function (done) {
        var query = (_a = ["\n      query myQueryName {\n        fortuneCookie\n      }"], _a.raw = ["\n      query myQueryName {\n        fortuneCookie\n      }"], graphql_tag_2.default(_a));
        var data = {
            'fortuneCookie': 'The waiter spit in your food',
        };
        var networkInterface = {
            query: function (request) {
                assert.equal(request.operationName, 'myQueryName');
                return Promise.resolve({ data: data });
            },
        };
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, data);
            done();
        });
        var _a;
    });
    it('should send operationName along with the mutation to the server', function (done) {
        var mutation = (_a = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], _a.raw = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], graphql_tag_2.default(_a));
        var data = {
            'fortuneCookie': 'The waiter spit in your food',
        };
        var networkInterface = {
            query: function (request) {
                assert.equal(request.operationName, 'myMutationName');
                return Promise.resolve({ data: data });
            },
        };
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, data);
            done();
        });
        var _a;
    });
    it('does not deduplicate queries by default', function () {
        var queryDoc = (_a = ["\n      query {\n        author {\n          name\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          name\n        }\n      }"], graphql_tag_2.default(_a));
        var data = {
            author: {
                name: 'Jonas',
            },
        };
        var data2 = {
            author: {
                name: 'Dhaivat',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: queryDoc },
            result: { data: data },
            delay: 10,
        }, {
            request: { query: queryDoc },
            result: { data: data2 },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var q1 = client.query({ query: queryDoc });
        var q2 = client.query({ query: queryDoc });
        return Promise.all([q1, q2]).then(function (_a) {
            var result1 = _a[0], result2 = _a[1];
            assert.deepEqual(result1.data, data);
            assert.deepEqual(result2.data, data2);
        });
        var _a;
    });
    it('deduplicates queries if the option is set', function () {
        var queryDoc = (_a = ["\n      query {\n        author {\n          name\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          name\n        }\n      }"], graphql_tag_2.default(_a));
        var data = {
            author: {
                name: 'Jonas',
            },
        };
        var data2 = {
            author: {
                name: 'Dhaivat',
            },
        };
        var networkInterface = mockNetworkInterface_1.default({
            request: { query: queryDoc },
            result: { data: data },
            delay: 10,
        }, {
            request: { query: queryDoc },
            result: { data: data2 },
        });
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
            queryDeduplication: true,
        });
        var q1 = client.query({ query: queryDoc });
        var q2 = client.query({ query: queryDoc });
        return Promise.all([q1, q2]).then(function (_a) {
            var result1 = _a[0], result2 = _a[1];
            assert.deepEqual(result1.data, result2.data);
        });
        var _a;
    });
    describe('accepts dataIdFromObject option', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            id\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            id\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        id: '1',
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        it('for internal store', function () {
            var networkInterface = mockNetworkInterface_1.default({
                request: { query: query },
                result: { data: data },
            });
            var client = new src_1.default({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) { return obj.id; },
                addTypename: false,
            });
            return client.query({ query: query })
                .then(function (result) {
                assert.deepEqual(result.data, data);
                assert.deepEqual(client.store.getState()['apollo'].data['1'], {
                    id: '1',
                    name: 'Luke Skywalker',
                });
            });
        });
        it('for existing store', function () {
            var networkInterface = mockNetworkInterface_1.default({
                request: { query: query },
                result: { data: data },
            });
            var client = new src_1.default({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) { return obj.id; },
                addTypename: false,
            });
            var store = redux_1.createStore(redux_1.combineReducers({
                apollo: client.reducer(),
            }), redux_1.applyMiddleware(client.middleware()));
            return client.query({ query: query })
                .then(function (result) {
                assert.deepEqual(result.data, data);
                assert.deepEqual(store.getState()['apollo'].data['1'], {
                    id: '1',
                    name: 'Luke Skywalker',
                });
            });
        });
        var _a;
    });
    describe('forceFetch', function () {
        var query = (_a = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], _a.raw = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var firstFetch = {
            myNumber: {
                n: 1,
            },
        };
        var secondFetch = {
            myNumber: {
                n: 2,
            },
        };
        var networkInterface;
        var clock;
        beforeEach(function () {
            networkInterface = mockNetworkInterface_1.default({
                request: { query: query },
                result: { data: firstFetch },
            }, {
                request: { query: query },
                result: { data: secondFetch },
            });
        });
        afterEach(function () {
            if (clock) {
                clock.restore();
            }
        });
        it('forces the query to rerun', function () {
            var client = new src_1.default({
                networkInterface: networkInterface,
                addTypename: false,
            });
            return client.query({ query: query })
                .then(function () { return client.query({ query: query, forceFetch: true }); })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 2 } });
            });
        });
        it('can be disabled with ssrMode', function () {
            var client = new src_1.default({
                networkInterface: networkInterface,
                ssrMode: true,
                addTypename: false,
            });
            var options = { query: query, forceFetch: true };
            return client.query({ query: query })
                .then(function () { return client.query(options); })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 1 } });
                assert.deepEqual(options, { query: query, forceFetch: true });
            });
        });
        it('can temporarily be disabled with ssrForceFetchDelay', function () {
            clock = sinon.useFakeTimers();
            var client = new src_1.default({
                networkInterface: networkInterface,
                ssrForceFetchDelay: 100,
                addTypename: false,
            });
            var outerPromise = client.query({ query: query })
                .then(function () {
                var promise = client.query({ query: query, forceFetch: true });
                clock.tick(0);
                return promise;
            })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 1 } });
                clock.tick(100);
                var promise = client.query({ query: query, forceFetch: true });
                clock.tick(0);
                return promise;
            })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 2 } });
            });
            clock.tick(0);
            return outerPromise;
        });
        var _a;
    });
    it('should expose a method called printAST that is prints graphql queries', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie\n      }"], _a.raw = ["\n      query {\n        fortuneCookie\n      }"], graphql_tag_2.default(_a));
        assert.equal(src_1.printAST(query), printer_1.print(query));
        var _a;
    });
    it('should pass a network error correctly on a mutation', function (done) {
        var mutation = (_a = ["\n      mutation {\n        person {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      mutation {\n        person {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var data = {
            person: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var networkError = new Error('Some kind of network error.');
        var client = new src_1.default({
            networkInterface: mockNetworkInterface_1.default({
                request: { query: mutation },
                result: { data: data },
                error: networkError,
            }),
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            assert(error.networkError);
            assert.equal(error.networkError.message, networkError.message);
            done();
        });
        var _a;
    });
    it('should pass a GraphQL error correctly on a mutation', function (done) {
        var mutation = (_a = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], _a.raw = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], graphql_tag_2.default(_a));
        var data = {
            person: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var errors = [new Error('Some kind of GraphQL error.')];
        var client = new src_1.default({
            networkInterface: mockNetworkInterface_1.default({
                request: { query: mutation },
                result: { data: data, errors: errors },
            }),
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            assert(error.graphQLErrors);
            assert.equal(error.graphQLErrors.length, 1);
            assert.equal(error.graphQLErrors[0].message, errors[0].message);
            done();
        });
        var _a;
    });
    it('has a resetStore method which calls QueryManager', function (done) {
        var client = new src_1.default();
        client.queryManager = {
            resetStore: function () {
                done();
            },
        };
        client.resetStore();
    });
    it('should allow us to create a network interface with transport-level batching', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], graphql_tag_2.default(_b));
        var secondResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = mockFetch_1.createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: printer_1.print(firstQuery),
                    },
                    {
                        query: printer_1.print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: mockFetch_1.createMockedIResponse([firstResult, secondResult]),
        });
        var networkInterface = batchedNetworkInterface_1.createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            networkInterface.query({ query: secondQuery }),
        ]).then(function (results) {
            assert.deepEqual(results, [firstResult, secondResult]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should throw an error if response to batch request is not an array', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], graphql_tag_2.default(_b));
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = mockFetch_1.createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: printer_1.print(firstQuery),
                    },
                    {
                        query: printer_1.print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: mockFetch_1.createMockedIResponse(firstResult),
        });
        var networkInterface = batchedNetworkInterface_1.createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            networkInterface.query({ query: secondQuery }),
        ]).then(function (results) {
            assert.equal(true, false, 'expected response to throw an error');
        }).catch(function (e) {
            assert.equal(e.message, 'BatchingNetworkInterface: server response is not an array');
            fetch = oldFetch;
            done();
        });
        var _a, _b;
    });
    it('should not do transport-level batching when the interval is exceeded', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_2.default(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], graphql_tag_2.default(_b));
        var secondResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = mockFetch_1.createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: printer_1.print(firstQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: mockFetch_1.createMockedIResponse([firstResult]),
        }, {
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: printer_1.print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: mockFetch_1.createMockedIResponse([secondResult]),
        });
        var networkInterface = batchedNetworkInterface_1.createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            new Promise(function (resolve, reject) {
                return setTimeout(function () { return resolve(networkInterface.query({ query: secondQuery })); }, 10);
            }),
        ]).then(function (results) {
            assert.deepEqual(results, [firstResult, secondResult]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should enable dev tools logging', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], graphql_tag_2.default(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        it('with self-made store', function () {
            var networkInterface = mockNetworkInterface_1.default({
                request: { query: lodash_1.cloneDeep(query) },
                result: { data: data },
            });
            var client = new src_1.default({
                networkInterface: networkInterface,
                addTypename: false,
            });
            var log = [];
            client.__actionHookForDevTools(function (entry) {
                log.push(entry);
            });
            return client.query({ query: query })
                .then(function () {
                assert.equal(log.length, 2);
                assert.equal(log[1].state.queries['0'].loading, false);
            });
        });
        it('with passed in store', function () {
            var networkInterface = mockNetworkInterface_1.default({
                request: { query: lodash_1.cloneDeep(query) },
                result: { data: data },
            });
            var client = new src_1.default({
                networkInterface: networkInterface,
                addTypename: false,
            });
            redux_1.createStore(redux_1.combineReducers({
                apollo: client.reducer(),
            }), {}, redux_1.applyMiddleware(client.middleware()));
            var log = [];
            client.__actionHookForDevTools(function (entry) {
                log.push(entry);
            });
            return client.query({ query: query })
                .then(function () {
                assert.equal(log.length, 2);
            });
        });
        var _a;
    });
    it('should propagate errors from network interface to observers', function (done) {
        var networkInterface = {
            query: function () { return Promise.reject(new Error('Uh oh!')); },
        };
        var client = new src_1.default({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: (_a = ["query { a b c }"], _a.raw = ["query { a b c }"], graphql_tag_2.default(_a)) });
        handle.subscribe({
            error: function (error) {
                assert.equal(error.message, 'Network error: Uh oh!');
                done();
            },
        });
        var _a;
    });
});
function clientRoundrip(query, data, variables) {
    var networkInterface = mockNetworkInterface_1.default({
        request: { query: lodash_1.cloneDeep(query) },
        result: { data: data },
    });
    var client = new src_1.default({
        networkInterface: networkInterface,
    });
    return client.query({ query: query, variables: variables })
        .then(function (result) {
        assert.deepEqual(result.data, data);
    });
}
//# sourceMappingURL=client.js.map