"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRealtime = initRealtime;
exports.emitRealtime = emitRealtime;
var socket_io_1 = require("socket.io");
var jsonwebtoken_1 = require("jsonwebtoken");
var config_1 = require("./config");
var io = null;
function initRealtime(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: config_1.config.corsOrigin, credentials: true },
    });
    io.use(function (socket, next) {
        var _a;
        var token = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
        if (!token)
            return next();
        try {
            jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            next();
        }
        catch (_b) {
            next(new Error('unauthenticated'));
        }
    });
    io.on('connection', function (socket) {
        socket.on('disconnect', function () { return undefined; });
    });
    return io;
}
function emitRealtime(event) {
    io === null || io === void 0 ? void 0 : io.emit('gate-event', event);
}
