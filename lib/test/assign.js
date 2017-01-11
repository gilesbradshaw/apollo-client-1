"use strict";
var assign_1 = require("../src/util/assign");
var chai_1 = require("chai");
describe('assign', function () {
    it('will merge many objects together', function () {
        chai_1.assert.deepEqual(assign_1.assign({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
        chai_1.assert.deepEqual(assign_1.assign({ a: 1 }, { b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 });
        chai_1.assert.deepEqual(assign_1.assign({ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }), { a: 1, b: 2, c: 3, d: 4 });
    });
    it('will merge many objects together shallowly', function () {
        chai_1.assert.deepEqual(assign_1.assign({ x: { a: 1 } }, { x: { b: 2 } }), { x: { b: 2 } });
        chai_1.assert.deepEqual(assign_1.assign({ x: { a: 1 } }, { x: { b: 2 } }, { x: { c: 3 } }), { x: { c: 3 } });
        chai_1.assert.deepEqual(assign_1.assign({ x: { a: 1 } }, { x: { b: 2 } }, { x: { c: 3 } }, { x: { d: 4 } }), { x: { d: 4 } });
    });
    it('will mutate and return the source objects', function () {
        var source1 = { a: 1 };
        var source2 = { a: 1 };
        var source3 = { a: 1 };
        chai_1.assert.strictEqual(assign_1.assign(source1, { b: 2 }), source1);
        chai_1.assert.strictEqual(assign_1.assign(source2, { b: 2 }, { c: 3 }), source2);
        chai_1.assert.strictEqual(assign_1.assign(source3, { b: 2 }, { c: 3 }, { d: 4 }), source3);
        chai_1.assert.deepEqual(source1, { a: 1, b: 2 });
        chai_1.assert.deepEqual(source2, { a: 1, b: 2, c: 3 });
        chai_1.assert.deepEqual(source3, { a: 1, b: 2, c: 3, d: 4 });
    });
});
//# sourceMappingURL=assign.js.map