"use strict";
var printer_1 = require("graphql-tag/printer");
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
        return printer_1.print(request.query) + "|" + JSON.stringify(request.variables) + "|" + request.operationName;
    };
    return Deduplicator;
}());
exports.Deduplicator = Deduplicator;
//# sourceMappingURL=Deduplicator.js.map