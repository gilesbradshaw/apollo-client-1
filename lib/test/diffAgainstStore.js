"use strict";
var chai_1 = require("chai");
var readFromStore_1 = require("../src/data/readFromStore");
var writeToStore_1 = require("../src/data/writeToStore");
var graphql_tag_1 = require("graphql-tag");
describe('diffing queries against the store', function () {
    it('returns nothing when the store is enough', function () {
        var query = (_a = ["\n      {\n        people_one(id: \"1\") {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: \"1\") {\n          name\n        }\n      }\n    "], graphql_tag_1.default(_a));
        var result = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: result,
            query: query,
        });
        chai_1.assert.notOk(readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: query,
        }).isMissing);
        var _a;
    });
    it('caches root queries both under the ID of the node and the query name', function () {
        var firstQuery = (_a = ["\n      {\n        people_one(id: \"1\") {\n          __typename,\n          id,\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: \"1\") {\n          __typename,\n          id,\n          name\n        }\n      }\n    "], graphql_tag_1.default(_a));
        var result = {
            people_one: {
                __typename: 'Person',
                id: '1',
                name: 'Luke Skywalker',
            },
        };
        var getIdField = function (_a) {
            var id = _a.id;
            return id;
        };
        var store = writeToStore_1.writeQueryToStore({
            result: result,
            query: firstQuery,
            dataIdFromObject: getIdField,
        });
        var secondQuery = (_b = ["\n      {\n        people_one(id: \"1\") {\n          __typename,\n          id,\n          name\n        }\n      }\n    "], _b.raw = ["\n      {\n        people_one(id: \"1\") {\n          __typename,\n          id,\n          name\n        }\n      }\n    "], graphql_tag_1.default(_b));
        var isMissing = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: secondQuery,
        }).isMissing;
        chai_1.assert.notOk(isMissing);
        chai_1.assert.deepEqual(store['1'], result.people_one);
        var _a, _b;
    });
    it('does not swallow errors other than field errors', function () {
        var firstQuery = (_a = ["\n      query {\n        person {\n          powers\n        }\n      }"], _a.raw = ["\n      query {\n        person {\n          powers\n        }\n      }"], graphql_tag_1.default(_a));
        var firstResult = {
            person: {
                powers: 'the force',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: firstResult,
            query: firstQuery,
        });
        var unionQuery = (_b = ["\n      query {\n        ...notARealFragment\n      }"], _b.raw = ["\n      query {\n        ...notARealFragment\n      }"], graphql_tag_1.default(_b));
        chai_1.assert.throws(function () {
            readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: unionQuery,
                variables: null,
            });
        }, /No fragment/);
        var _a, _b;
    });
    it('does not error on a correct query with union typed fragments', function () {
        var firstQuery = (_a = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], graphql_tag_1.default(_a));
        var firstResult = {
            person: {
                __typename: 'Author',
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: firstResult,
            query: firstQuery,
        });
        var unionQuery = (_b = ["\n      query {\n        person {\n          __typename\n          ... on Author {\n            firstName\n            lastName\n          }\n\n          ... on Jedi {\n            powers\n          }\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          __typename\n          ... on Author {\n            firstName\n            lastName\n          }\n\n          ... on Jedi {\n            powers\n          }\n        }\n      }"], graphql_tag_1.default(_b));
        var isMissing = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: unionQuery,
            variables: null,
            returnPartialData: false,
        }).isMissing;
        chai_1.assert.isTrue(isMissing);
        var _a, _b;
    });
    it('does not error on a query with fields missing from all but one named fragment', function () {
        var firstQuery = (_a = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], graphql_tag_1.default(_a));
        var firstResult = {
            person: {
                __typename: 'Author',
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: firstResult,
            query: firstQuery,
        });
        var unionQuery = (_b = ["\n      query {\n        person {\n          __typename\n          ...authorInfo\n          ...jediInfo\n        }\n      }\n      fragment authorInfo on Author {\n        firstName\n      }\n      fragment jediInfo on Jedi {\n        powers\n      }"], _b.raw = ["\n      query {\n        person {\n          __typename\n          ...authorInfo\n          ...jediInfo\n        }\n      }\n      fragment authorInfo on Author {\n        firstName\n      }\n      fragment jediInfo on Jedi {\n        powers\n      }"], graphql_tag_1.default(_b));
        var isMissing = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: unionQuery,
            variables: null,
            returnPartialData: false,
        }).isMissing;
        chai_1.assert.isTrue(isMissing);
        var _a, _b;
    });
    it('throws an error on a query with fields missing from matching named fragments', function () {
        var firstQuery = (_a = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        person {\n          __typename\n          firstName\n          lastName\n        }\n      }"], graphql_tag_1.default(_a));
        var firstResult = {
            person: {
                __typename: 'Author',
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: firstResult,
            query: firstQuery,
        });
        var unionQuery = (_b = ["\n      query {\n        person {\n          __typename\n          ...authorInfo\n          ...jediInfo\n        }\n      }\n      fragment authorInfo on Author {\n        firstName\n        address\n      }\n      fragment jediInfo on Jedi {\n        jedi\n      }"], _b.raw = ["\n      query {\n        person {\n          __typename\n          ...authorInfo\n          ...jediInfo\n        }\n      }\n      fragment authorInfo on Author {\n        firstName\n        address\n      }\n      fragment jediInfo on Jedi {\n        jedi\n      }"], graphql_tag_1.default(_b));
        chai_1.assert.throw(function () {
            readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: unionQuery,
                variables: null,
                returnPartialData: false,
            });
        });
        var _a, _b;
    });
    it('returns available fields if throwOnMissingField is false', function () {
        var firstQuery = (_a = ["\n      {\n        people_one(id: \"1\") {\n          __typename\n          id\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: \"1\") {\n          __typename\n          id\n          name\n        }\n      }\n    "], graphql_tag_1.default(_a));
        var firstResult = {
            people_one: {
                __typename: 'Person',
                id: 'lukeId',
                name: 'Luke Skywalker',
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            result: firstResult,
            query: firstQuery,
        });
        var simpleQuery = (_b = ["\n      {\n        people_one(id: \"1\") {\n          name\n          age\n        }\n      }\n    "], _b.raw = ["\n      {\n        people_one(id: \"1\") {\n          name\n          age\n        }\n      }\n    "], graphql_tag_1.default(_b));
        var inlineFragmentQuery = (_c = ["\n      {\n        people_one(id: \"1\") {\n          ... on Person {\n            name\n            age\n          }\n        }\n      }\n    "], _c.raw = ["\n      {\n        people_one(id: \"1\") {\n          ... on Person {\n            name\n            age\n          }\n        }\n      }\n    "], graphql_tag_1.default(_c));
        var namedFragmentQuery = (_d = ["\n      query {\n        people_one(id: \"1\") {\n          ...personInfo\n        }\n      }\n      fragment personInfo on Person {\n        name\n        age\n      }"], _d.raw = ["\n      query {\n        people_one(id: \"1\") {\n          ...personInfo\n        }\n      }\n      fragment personInfo on Person {\n        name\n        age\n      }"], graphql_tag_1.default(_d));
        var simpleDiff = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: simpleQuery,
            variables: null,
        });
        chai_1.assert.deepEqual(simpleDiff.result, {
            people_one: {
                name: 'Luke Skywalker',
            },
        });
        var inlineDiff = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: inlineFragmentQuery,
            variables: null,
        });
        chai_1.assert.deepEqual(inlineDiff.result, {
            people_one: {
                name: 'Luke Skywalker',
            },
        });
        var namedDiff = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: namedFragmentQuery,
            variables: null,
        });
        chai_1.assert.deepEqual(namedDiff.result, {
            people_one: {
                name: 'Luke Skywalker',
            },
        });
        chai_1.assert.throws(function () {
            readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: simpleQuery,
                variables: null,
                returnPartialData: false,
            });
        });
        var _a, _b, _c, _d;
    });
    it('will add a private id property', function () {
        var query = (_a = ["\n      query {\n        a { id b }\n        c { d e { id f } g { h } }\n      }\n    "], _a.raw = ["\n      query {\n        a { id b }\n        c { d e { id f } g { h } }\n      }\n    "], graphql_tag_1.default(_a));
        var queryResult = {
            a: [
                { id: 'a:1', b: 1.1 },
                { id: 'a:2', b: 1.2 },
                { id: 'a:3', b: 1.3 },
            ],
            c: {
                d: 2,
                e: [
                    { id: 'e:1', f: 3.1 },
                    { id: 'e:2', f: 3.2 },
                    { id: 'e:3', f: 3.3 },
                    { id: 'e:4', f: 3.4 },
                    { id: 'e:5', f: 3.5 },
                ],
                g: { h: 4 },
            },
        };
        var store = writeToStore_1.writeQueryToStore({
            query: query,
            result: queryResult,
            dataIdFromObject: function (_a) {
                var id = _a.id;
                return id;
            },
        });
        var result = readFromStore_1.diffQueryAgainstStore({
            store: store,
            query: query,
        }).result;
        chai_1.assert.deepEqual(result, queryResult);
        chai_1.assert.equal(result[readFromStore_1.ID_KEY], 'ROOT_QUERY');
        chai_1.assert.equal(result.a[0][readFromStore_1.ID_KEY], 'a:1');
        chai_1.assert.equal(result.a[1][readFromStore_1.ID_KEY], 'a:2');
        chai_1.assert.equal(result.a[2][readFromStore_1.ID_KEY], 'a:3');
        chai_1.assert.equal(result.c[readFromStore_1.ID_KEY], '$ROOT_QUERY.c');
        chai_1.assert.equal(result.c.e[0][readFromStore_1.ID_KEY], 'e:1');
        chai_1.assert.equal(result.c.e[1][readFromStore_1.ID_KEY], 'e:2');
        chai_1.assert.equal(result.c.e[2][readFromStore_1.ID_KEY], 'e:3');
        chai_1.assert.equal(result.c.e[3][readFromStore_1.ID_KEY], 'e:4');
        chai_1.assert.equal(result.c.e[4][readFromStore_1.ID_KEY], 'e:5');
        chai_1.assert.equal(result.c.g[readFromStore_1.ID_KEY], '$ROOT_QUERY.c.g');
        var _a;
    });
    describe('referential equality preservation', function () {
        it('will return the previous result if there are no changes', function () {
            var query = (_a = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: { b: 1 },
                c: { d: 2, e: { f: 3 } },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: { b: 1 },
                c: { d: 2, e: { f: 3 } },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.strictEqual(result, previousResult);
            var _a;
        });
        it('will return parts of the previous result that changed', function () {
            var query = (_a = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: { b: 1 },
                c: { d: 2, e: { f: 3 } },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: { b: 1 },
                c: { d: 20, e: { f: 3 } },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.notStrictEqual(result, previousResult);
            chai_1.assert.strictEqual(result.a, previousResult.a);
            chai_1.assert.notStrictEqual(result.c, previousResult.c);
            chai_1.assert.strictEqual(result.c.e, previousResult.c.e);
            var _a;
        });
        it('will return the previous result if there are no changes in child arrays', function () {
            var query = (_a = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: [{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }],
                c: { d: 2, e: [{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }, { f: 3.4 }, { f: 3.5 }] },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: [{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }],
                c: { d: 2, e: [{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }, { f: 3.4 }, { f: 3.5 }] },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.strictEqual(result, previousResult);
            var _a;
        });
        it('will not add zombie items when previousResult starts with the same items', function () {
            var query = (_a = ["\n        query {\n          a { b }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: [{ b: 1.1 }, { b: 1.2 }],
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: [{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }],
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.strictEqual(result.a[0], previousResult.a[0]);
            chai_1.assert.strictEqual(result.a[1], previousResult.a[1]);
            var _a;
        });
        it('will return the previous result if there are no changes in nested child arrays', function () {
            var query = (_a = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: [[[[[{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }]]]]],
                c: { d: 2, e: [[{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }], [{ f: 3.4 }, { f: 3.5 }]] },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: [[[[[{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }]]]]],
                c: { d: 2, e: [[{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }], [{ f: 3.4 }, { f: 3.5 }]] },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.strictEqual(result, previousResult);
            var _a;
        });
        it('will return parts of the previous result if there are changes in child arrays', function () {
            var query = (_a = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], _a.raw = ["\n        query {\n          a { b }\n          c { d e { f } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: [{ b: 1.1 }, { b: 1.2 }, { b: 1.3 }],
                c: { d: 2, e: [{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }, { f: 3.4 }, { f: 3.5 }] },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: [{ b: 1.1 }, { b: -1.2 }, { b: 1.3 }],
                c: { d: 20, e: [{ f: 3.1 }, { f: 3.2 }, { f: 3.3 }, { f: 3.4 }, { f: 3.5 }] },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.notStrictEqual(result, previousResult);
            chai_1.assert.notStrictEqual(result.a, previousResult.a);
            chai_1.assert.strictEqual(result.a[0], previousResult.a[0]);
            chai_1.assert.notStrictEqual(result.a[1], previousResult.a[1]);
            chai_1.assert.strictEqual(result.a[2], previousResult.a[2]);
            chai_1.assert.notStrictEqual(result.c, previousResult.c);
            chai_1.assert.notStrictEqual(result.c.e, previousResult.c.e);
            chai_1.assert.strictEqual(result.c.e[0], previousResult.c.e[0]);
            chai_1.assert.strictEqual(result.c.e[1], previousResult.c.e[1]);
            chai_1.assert.strictEqual(result.c.e[2], previousResult.c.e[2]);
            chai_1.assert.strictEqual(result.c.e[3], previousResult.c.e[3]);
            chai_1.assert.strictEqual(result.c.e[4], previousResult.c.e[4]);
            var _a;
        });
        it('will return the same items in a different order with `dataIdFromObject`', function () {
            var query = (_a = ["\n        query {\n          a { id b }\n          c { d e { id f } g { h } }\n        }\n      "], _a.raw = ["\n        query {\n          a { id b }\n          c { d e { id f } g { h } }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: [
                    { id: 'a:1', b: 1.1 },
                    { id: 'a:2', b: 1.2 },
                    { id: 'a:3', b: 1.3 },
                ],
                c: {
                    d: 2,
                    e: [
                        { id: 'e:1', f: 3.1 },
                        { id: 'e:2', f: 3.2 },
                        { id: 'e:3', f: 3.3 },
                        { id: 'e:4', f: 3.4 },
                        { id: 'e:5', f: 3.5 },
                    ],
                    g: { h: 4 },
                },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
                dataIdFromObject: function (_a) {
                    var id = _a.id;
                    return id;
                },
            });
            var previousResult = {
                a: [
                    (_b = { id: 'a:3', b: 1.3 }, _b[readFromStore_1.ID_KEY] = 'a:3', _b),
                    (_c = { id: 'a:2', b: 1.2 }, _c[readFromStore_1.ID_KEY] = 'a:2', _c),
                    (_d = { id: 'a:1', b: 1.1 }, _d[readFromStore_1.ID_KEY] = 'a:1', _d),
                ],
                c: {
                    d: 2,
                    e: [
                        (_e = { id: 'e:4', f: 3.4 }, _e[readFromStore_1.ID_KEY] = 'e:4', _e),
                        (_f = { id: 'e:2', f: 3.2 }, _f[readFromStore_1.ID_KEY] = 'e:2', _f),
                        (_g = { id: 'e:5', f: 3.5 }, _g[readFromStore_1.ID_KEY] = 'e:5', _g),
                        (_h = { id: 'e:3', f: 3.3 }, _h[readFromStore_1.ID_KEY] = 'e:3', _h),
                        (_j = { id: 'e:1', f: 3.1 }, _j[readFromStore_1.ID_KEY] = 'e:1', _j),
                    ],
                    g: { h: 4 },
                },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.notStrictEqual(result, previousResult);
            chai_1.assert.notStrictEqual(result.a, previousResult.a);
            chai_1.assert.strictEqual(result.a[0], previousResult.a[2]);
            chai_1.assert.strictEqual(result.a[1], previousResult.a[1]);
            chai_1.assert.strictEqual(result.a[2], previousResult.a[0]);
            chai_1.assert.notStrictEqual(result.c, previousResult.c);
            chai_1.assert.notStrictEqual(result.c.e, previousResult.c.e);
            chai_1.assert.strictEqual(result.c.e[0], previousResult.c.e[4]);
            chai_1.assert.strictEqual(result.c.e[1], previousResult.c.e[1]);
            chai_1.assert.strictEqual(result.c.e[2], previousResult.c.e[3]);
            chai_1.assert.strictEqual(result.c.e[3], previousResult.c.e[0]);
            chai_1.assert.strictEqual(result.c.e[4], previousResult.c.e[2]);
            chai_1.assert.strictEqual(result.c.g, previousResult.c.g);
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        });
        it('will return the same JSON scalar field object', function () {
            var query = (_a = ["\n        {\n          a { b c }\n          d { e f }\n        }\n      "], _a.raw = ["\n        {\n          a { b c }\n          d { e f }\n        }\n      "], graphql_tag_1.default(_a));
            var queryResult = {
                a: { b: 1, c: { x: 2, y: 3, z: 4 } },
                d: { e: 5, f: { x: 6, y: 7, z: 8 } },
            };
            var store = writeToStore_1.writeQueryToStore({
                query: query,
                result: queryResult,
            });
            var previousResult = {
                a: { b: 1, c: { x: 2, y: 3, z: 4 } },
                d: { e: 50, f: { x: 6, y: 7, z: 8 } },
            };
            var result = readFromStore_1.diffQueryAgainstStore({
                store: store,
                query: query,
                previousResult: previousResult,
            }).result;
            chai_1.assert.deepEqual(result, queryResult);
            chai_1.assert.notStrictEqual(result, previousResult);
            chai_1.assert.strictEqual(result.a, previousResult.a);
            chai_1.assert.notStrictEqual(result.d, previousResult.d);
            chai_1.assert.strictEqual(result.d.f, previousResult.d.f);
            var _a;
        });
    });
});
//# sourceMappingURL=diffAgainstStore.js.map