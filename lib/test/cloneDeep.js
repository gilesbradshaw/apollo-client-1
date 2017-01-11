"use strict";
var cloneDeep_1 = require("../src/util/cloneDeep");
var chai_1 = require("chai");
describe('cloneDeep', function () {
    it('will clone primitive values', function () {
        chai_1.assert.equal(cloneDeep_1.cloneDeep(undefined), undefined);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(null), null);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(true), true);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(false), false);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(-1), -1);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(+1), +1);
        chai_1.assert.equal(cloneDeep_1.cloneDeep(0.5), 0.5);
        chai_1.assert.equal(cloneDeep_1.cloneDeep('hello'), 'hello');
        chai_1.assert.equal(cloneDeep_1.cloneDeep('world'), 'world');
    });
    it('will clone objects', function () {
        var value1 = {};
        var value2 = { a: 1, b: 2, c: 3 };
        var value3 = { x: { a: 1, b: 2, c: 3 }, y: { a: 1, b: 2, c: 3 } };
        var clonedValue1 = cloneDeep_1.cloneDeep(value1);
        var clonedValue2 = cloneDeep_1.cloneDeep(value2);
        var clonedValue3 = cloneDeep_1.cloneDeep(value3);
        chai_1.assert.deepEqual(clonedValue1, value1);
        chai_1.assert.deepEqual(clonedValue2, value2);
        chai_1.assert.deepEqual(clonedValue3, value3);
        chai_1.assert.notStrictEqual(clonedValue1, value1);
        chai_1.assert.notStrictEqual(clonedValue2, value2);
        chai_1.assert.notStrictEqual(clonedValue3, value3);
        chai_1.assert.notStrictEqual(clonedValue3.x, value3.x);
        chai_1.assert.notStrictEqual(clonedValue3.y, value3.y);
    });
    it('will clone arrays', function () {
        var value1 = [];
        var value2 = [1, 2, 3];
        var value3 = [[1, 2, 3], [1, 2, 3]];
        var clonedValue1 = cloneDeep_1.cloneDeep(value1);
        var clonedValue2 = cloneDeep_1.cloneDeep(value2);
        var clonedValue3 = cloneDeep_1.cloneDeep(value3);
        chai_1.assert.deepEqual(clonedValue1, value1);
        chai_1.assert.deepEqual(clonedValue2, value2);
        chai_1.assert.deepEqual(clonedValue3, value3);
        chai_1.assert.notStrictEqual(clonedValue1, value1);
        chai_1.assert.notStrictEqual(clonedValue2, value2);
        chai_1.assert.notStrictEqual(clonedValue3, value3);
        chai_1.assert.notStrictEqual(clonedValue3[0], value3[0]);
        chai_1.assert.notStrictEqual(clonedValue3[1], value3[1]);
    });
});
//# sourceMappingURL=cloneDeep.js.map