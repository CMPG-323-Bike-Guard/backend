"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = usersRoutes;
var zod_1 = require("zod");
var auth_plugin_1 = require("../auth-plugin");
var errors_1 = require("../errors");
var bikes_repo_1 = require("../repositories/bikes.repo");
var notifications_repo_1 = require("../repositories/notifications.repo");
var users_repo_1 = require("../repositories/users.repo");
var views_1 = require("../services/views");
var db_1 = require("../db");
var audit_repo_1 = require("../repositories/audit.repo");
var security_1 = require("../security");
var createUserSchema = zod_1.z.object({
    studentStaffNumber: zod_1.z.string().trim().regex(/^\d{8}$/, 'A student or staff number is 8 digits.'),
    name: zod_1.z.string().trim().min(2, 'Enter the full name.').max(80, 'Names are at most 80 characters.'),
    email: zod_1.z.string().trim().toLowerCase().email('Enter a valid email address.'),
    role: zod_1.z.enum(['student', 'guard', 'admin']),
    password: zod_1.z.string().min(8, 'Passwords are at least 8 characters.'),
});
function usersRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var markReadSchema;
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/users', function (request) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    request.requireRole('admin', 'guard');
                    return [2 /*return*/, users_repo_1.usersRepo.list(request.query.role)];
                });
            }); });
            app.post('/users', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var actor, body, passwordHash, user, err_1, pgError;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            body = createUserSchema.parse(request.body);
                            return [4 /*yield*/, (0, security_1.hashPassword)(body.password)];
                        case 1:
                            passwordHash = _a.sent();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, (0, db_1.withTransaction)(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var created;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, users_repo_1.usersRepo.create({
                                                    studentNumber: body.studentStaffNumber,
                                                    name: body.name,
                                                    email: body.email,
                                                    role: body.role,
                                                    passwordHash: passwordHash,
                                                })];
                                            case 1:
                                                created = _a.sent();
                                                return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                                        actorUserId: actor.userId,
                                                        action: 'user.created',
                                                        entityType: 'user',
                                                        entityId: created.userId,
                                                        detail: "".concat(created.name, " (").concat(created.role, ") was added with number ").concat(created.studentStaffNumber, "."),
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/, created];
                                        }
                                    });
                                }); })];
                        case 3:
                            user = _a.sent();
                            reply.status(201);
                            return [2 /*return*/, user];
                        case 4:
                            err_1 = _a.sent();
                            pgError = err_1;
                            if (pgError.code === '23505') {
                                if (pgError.constraint === 'users_email_key') {
                                    throw errors_1.ApiError.conflict('That email address is already in use.', 'email');
                                }
                                throw errors_1.ApiError.conflict('Someone with that student or staff number already exists.', 'studentStaffNumber');
                            }
                            throw err_1;
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            app.get('/users/lookup/:studentNumber', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request.requireRole('admin', 'guard');
                            return [4 /*yield*/, users_repo_1.usersRepo.findByStudentNumber(request.params.studentNumber)];
                        case 1:
                            user = _a.sent();
                            return [2 /*return*/, user];
                    }
                });
            }); });
            app.get('/users/:userId/bikes', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var bikes;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            (0, auth_plugin_1.requireOwnerOrRoles)(request, request.params.userId, 'admin');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.listForOwner(request.params.userId)];
                        case 1:
                            bikes = _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeViews)(bikes)];
                    }
                });
            }); });
            app.get('/users/:userId/notifications', function (request) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    (0, auth_plugin_1.requireOwnerOrRoles)(request, request.params.userId, 'admin');
                    return [2 /*return*/, notifications_repo_1.notificationsRepo.listForUser(request.params.userId)];
                });
            }); });
            markReadSchema = zod_1.z.object({ read: zod_1.z.boolean().default(true) });
            app.patch('/notifications/:notificationId', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var notification;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            request.requireAuth();
                            markReadSchema.parse((_a = request.body) !== null && _a !== void 0 ? _a : {});
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.findById(request.params.notificationId)];
                        case 1:
                            notification = _b.sent();
                            if (!notification)
                                throw errors_1.ApiError.notFound('That notification no longer exists.');
                            (0, auth_plugin_1.requireOwnerOrRoles)(request, notification.userId, 'admin');
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.markRead(request.params.notificationId)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, reply.status(204).send()];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
