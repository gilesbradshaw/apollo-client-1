"use strict";
var isEqual_1 = require("../src/util/isEqual");
var chai_1 = require("chai");
describe('isEqual', function () {
    it('should return true for equal primitive values', function () {
        chai_1.assert(isEqual_1.isEqual(undefined, undefined));
        chai_1.assert(isEqual_1.isEqual(null, null));
        chai_1.assert(isEqual_1.isEqual(true, true));
        chai_1.assert(isEqual_1.isEqual(false, false));
        chai_1.assert(isEqual_1.isEqual(-1, -1));
        chai_1.assert(isEqual_1.isEqual(+1, +1));
        chai_1.assert(isEqual_1.isEqual(42, 42));
        chai_1.assert(isEqual_1.isEqual(0, 0));
        chai_1.assert(isEqual_1.isEqual(0.5, 0.5));
        chai_1.assert(isEqual_1.isEqual('hello', 'hello'));
        chai_1.assert(isEqual_1.isEqual('world', 'world'));
    });
    it('should return false for not equal primitive values', function () {
        chai_1.assert(!isEqual_1.isEqual(undefined, null));
        chai_1.assert(!isEqual_1.isEqual(null, undefined));
        chai_1.assert(!isEqual_1.isEqual(true, false));
        chai_1.assert(!isEqual_1.isEqual(false, true));
        chai_1.assert(!isEqual_1.isEqual(-1, +1));
        chai_1.assert(!isEqual_1.isEqual(+1, -1));
        chai_1.assert(!isEqual_1.isEqual(42, 42.00000000000001));
        chai_1.assert(!isEqual_1.isEqual(0, 0.5));
        chai_1.assert(!isEqual_1.isEqual('hello', 'world'));
        chai_1.assert(!isEqual_1.isEqual('world', 'hello'));
    });
    it('should return false when comparing primitives with objects', function () {
        chai_1.assert(!isEqual_1.isEqual({}, null));
        chai_1.assert(!isEqual_1.isEqual(null, {}));
        chai_1.assert(!isEqual_1.isEqual({}, true));
        chai_1.assert(!isEqual_1.isEqual(true, {}));
        chai_1.assert(!isEqual_1.isEqual({}, 42));
        chai_1.assert(!isEqual_1.isEqual(42, {}));
        chai_1.assert(!isEqual_1.isEqual({}, 'hello'));
        chai_1.assert(!isEqual_1.isEqual('hello', {}));
    });
    it('should correctly compare shallow objects', function () {
        chai_1.assert(isEqual_1.isEqual({}, {}));
        chai_1.assert(isEqual_1.isEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 }));
        chai_1.assert(!isEqual_1.isEqual({ a: 1, b: 2, c: 3 }, { a: 3, b: 2, c: 1 }));
        chai_1.assert(!isEqual_1.isEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 }));
        chai_1.assert(!isEqual_1.isEqual({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }));
    });
    it('should correctly compare deep objects', function () {
        chai_1.assert(isEqual_1.isEqual({ x: {} }, { x: {} }));
        chai_1.assert(isEqual_1.isEqual({ x: { a: 1, b: 2, c: 3 } }, { x: { a: 1, b: 2, c: 3 } }));
        chai_1.assert(!isEqual_1.isEqual({ x: { a: 1, b: 2, c: 3 } }, { x: { a: 3, b: 2, c: 1 } }));
        chai_1.assert(!isEqual_1.isEqual({ x: { a: 1, b: 2, c: 3 } }, { x: { a: 1, b: 2 } }));
        chai_1.assert(!isEqual_1.isEqual({ x: { a: 1, b: 2 } }, { x: { a: 1, b: 2, c: 3 } }));
    });
});
//# sourceMappingURL=isEqual.js.map