"use strict";
var queryTransform_1 = require("../src/queries/queryTransform");
var getFromAST_1 = require("../src/queries/getFromAST");
var printer_1 = require("graphql-tag/printer");
var graphql_tag_1 = require("graphql-tag");
var chai_1 = require("chai");
describe('query transforms', function () {
    it('should correctly add typenames', function () {
        var testQuery = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n        }\n      }\n    "], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n        }\n      }\n    "], graphql_tag_1.default(_a));
        var newQueryDoc = queryTransform_1.addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], graphql_tag_1.default(_b));
        var expectedQueryStr = printer_1.print(expectedQuery);
        chai_1.assert.equal(expectedQueryStr, printer_1.print(newQueryDoc));
        var _a, _b;
    });
    it('should not add duplicates', function () {
        var testQuery = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n        }\n      }\n    "], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n        }\n      }\n    "], graphql_tag_1.default(_a));
        var newQueryDoc = queryTransform_1.addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], graphql_tag_1.default(_b));
        var expectedQueryStr = printer_1.print(expectedQuery);
        chai_1.assert.equal(expectedQueryStr, printer_1.print(newQueryDoc));
        var _a, _b;
    });
    it('should not screw up on a FragmentSpread within the query AST', function () {
        var testQuery = (_a = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }"], _a.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }"], graphql_tag_1.default(_a));
        var expectedQuery = getFromAST_1.getQueryDefinition((_b = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    "], _b.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    "], graphql_tag_1.default(_b)));
        var modifiedQuery = queryTransform_1.addTypenameToDocument(testQuery);
        chai_1.assert.equal(printer_1.print(expectedQuery), printer_1.print(getFromAST_1.getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
    it('should modify all definitions in a document', function () {
        var testQuery = (_a = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n    }"], _a.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n    }"], graphql_tag_1.default(_a));
        var newQueryDoc = queryTransform_1.addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n      __typename\n    }"], _b.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n      __typename\n    }"], graphql_tag_1.default(_b));
        chai_1.assert.equal(printer_1.print(expectedQuery), printer_1.print(newQueryDoc));
        var _a, _b;
    });
    it('should be able to apply a QueryTransformer correctly', function () {
        var testQuery = (_a = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], _a.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], graphql_tag_1.default(_a));
        var expectedQuery = getFromAST_1.getQueryDefinition((_b = ["\n    query {\n      author {\n        firstName\n        lastName\n        __typename\n      }\n    }\n    "], _b.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n        __typename\n      }\n    }\n    "], graphql_tag_1.default(_b)));
        var modifiedQuery = queryTransform_1.addTypenameToDocument(testQuery);
        chai_1.assert.equal(printer_1.print(expectedQuery), printer_1.print(getFromAST_1.getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
    it('should be able to apply a MutationTransformer correctly', function () {
        var testQuery = (_a = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], graphql_tag_1.default(_a));
        var expectedQuery = (_b = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], graphql_tag_1.default(_b));
        var modifiedQuery = queryTransform_1.addTypenameToDocument(testQuery);
        chai_1.assert.equal(printer_1.print(expectedQuery), printer_1.print(modifiedQuery));
        var _a, _b;
    });
    it('should add typename fields correctly on this one query', function () {
        var testQuery = (_a = ["\n        query Feed($type: FeedType!) {\n          # Eventually move this into a no fetch query right on the entry\n          # since we literally just need this info to determine whether to\n          # show upvote/downvote buttons\n          currentUser {\n            login\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n              }\n            }\n          }\n        }"], _a.raw = ["\n        query Feed($type: FeedType!) {\n          # Eventually move this into a no fetch query right on the entry\n          # since we literally just need this info to determine whether to\n          # show upvote/downvote buttons\n          currentUser {\n            login\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n              }\n            }\n          }\n        }"], graphql_tag_1.default(_a));
        var expectedQuery = getFromAST_1.getQueryDefinition((_b = ["\n      query Feed($type: FeedType!) {\n          currentUser {\n            login\n            __typename\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n              __typename\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n        }"], _b.raw = ["\n      query Feed($type: FeedType!) {\n          currentUser {\n            login\n            __typename\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n              __typename\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n        }"], graphql_tag_1.default(_b)));
        var modifiedQuery = queryTransform_1.addTypenameToDocument(testQuery);
        chai_1.assert.equal(printer_1.print(expectedQuery), printer_1.print(getFromAST_1.getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
});
//# sourceMappingURL=queryTransform.js.map