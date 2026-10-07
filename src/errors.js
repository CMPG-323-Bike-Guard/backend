"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.registerErrorHandler = registerErrorHandler;
var zod_1 = require("zod");
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(statusCode, code, message, field) {
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.code = code;
        _this.field = field;
        return _this;
    }
    ApiError.notFound = function (message) {
        if (message === void 0) { message = 'That resource no longer exists.'; }
        return new ApiError(404, 'not_found', message);
    };
    ApiError.badRequest = function (message, field) {
        return new ApiError(400, 'invalid', message, field);
    };
    ApiError.conflict = function (message, field) {
        return new ApiError(409, 'conflict', message, field);
    };
    ApiError.unauthenticated = function (message) {
        if (message === void 0) { message = 'Your session has expired. Sign in again.'; }
        return new ApiError(401, 'unauthenticated', message);
    };
    ApiError.forbidden = function (message) {
        if (message === void 0) { message = 'You do not have permission to do that.'; }
        return new ApiError(403, 'forbidden', message);
    };
    return ApiError;
}(Error));
exports.ApiError = ApiError;
function registerErrorHandler(app) {
    app.setErrorHandler(function (error, request, reply) {
        var _a, _b, _c;
        if (error instanceof ApiError) {
            reply.status(error.statusCode).send({ code: error.code, message: error.message, field: error.field });
            return;
        }
        if (error instanceof zod_1.ZodError) {
            var first = error.issues[0];
            reply.status(400).send({
                code: 'invalid',
                message: (_a = first === null || first === void 0 ? void 0 : first.message) !== null && _a !== void 0 ? _a : 'Invalid request.',
                field: ((_b = first === null || first === void 0 ? void 0 : first.path) === null || _b === void 0 ? void 0 : _b.join('.')) || undefined,
            });
            return;
        }
        var fastifyError = error;
        if (fastifyError.statusCode && fastifyError.statusCode < 500) {
            reply.status(fastifyError.statusCode).send({ code: (_c = fastifyError.code) !== null && _c !== void 0 ? _c : 'invalid', message: error.message });
            return;
        }
        request.log.error(error);
        reply.status(500).send({ code: 'internal_error', message: 'Something went wrong.' });
    });
}
