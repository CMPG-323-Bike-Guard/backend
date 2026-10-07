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
exports.default = bikesRoutes;
var zod_1 = require("zod");
var auth_plugin_1 = require("../auth-plugin");
var errors_1 = require("../errors");
var audit_repo_1 = require("../repositories/audit.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var notifications_repo_1 = require("../repositories/notifications.repo");
var permissions_repo_1 = require("../repositories/permissions.repo");
var tags_repo_1 = require("../repositories/tags.repo");
var users_repo_1 = require("../repositories/users.repo");
var uploads_1 = require("../uploads");
var views_1 = require("../services/views");
var createBikeSchema = zod_1.z.object({
    ownerUserId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1, 'Give the bike a name.'),
    makeModel: zod_1.z.string().default(''),
    colour: zod_1.z.string().default(''),
    photoDataUrl: zod_1.z.string().nullable().optional(),
    submit: zod_1.z.boolean().default(false),
});
var updateBikeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    makeModel: zod_1.z.string().optional(),
    colour: zod_1.z.string().optional(),
    photoDataUrl: zod_1.z.string().nullable().optional(),
});
var reportLostSchema = zod_1.z.object({ stolen: zod_1.z.boolean().default(false) });
var grantPermissionSchema = zod_1.z.object({ studentNumber: zod_1.z.string().min(1) });
function requireBikeAccess(request, bikeId) {
    return __awaiter(this, void 0, void 0, function () {
        var bike;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(bikeId)];
                case 1:
                    bike = _a.sent();
                    if (!bike)
                        throw errors_1.ApiError.notFound('That bike no longer exists.');
                    (0, auth_plugin_1.requireOwnerOrRoles)(request, bike.ownerUserId, 'admin');
                    return [2 /*return*/, bike];
            }
        });
    });
}
function bikesRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/bikes/:bikeId', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var bike;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(bike)];
                    }
                });
            }); });
            app.post('/bikes', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, body, owner, bike, finalBike, photoPath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('student', 'admin');
                            body = createBikeSchema.parse(request.body);
                            if (actor.role === 'student' && actor.userId !== body.ownerUserId) {
                                throw errors_1.ApiError.forbidden('You can only register bikes to your own profile.');
                            }
                            return [4 /*yield*/, users_repo_1.usersRepo.findById(body.ownerUserId)];
                        case 1:
                            owner = _a.sent();
                            if (!owner)
                                throw errors_1.ApiError.notFound('No student matches that number.');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.create({
                                    ownerUserId: body.ownerUserId,
                                    name: body.name.trim(),
                                    makeModel: body.makeModel.trim(),
                                    colour: body.colour.trim(),
                                    photoPath: null,
                                    status: body.submit ? 'pending_approval' : 'draft',
                                })];
                        case 2:
                            bike = _a.sent();
                            finalBike = bike;
                            if (!body.photoDataUrl) return [3 /*break*/, 5];
                            return [4 /*yield*/, (0, uploads_1.savePhotoDataUrl)(body.photoDataUrl, 'bikes', bike.bikeId)];
                        case 3:
                            photoPath = _a.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.update(bike.bikeId, { photoPath: photoPath })];
                        case 4:
                            finalBike = (_a.sent());
                            _a.label = 5;
                        case 5: return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                actorUserId: actor.userId,
                                action: body.submit ? 'registration.submitted' : 'registration.drafted',
                                entityType: 'bike',
                                entityId: bike.bikeId,
                                detail: "".concat(finalBike.name, " (").concat(finalBike.makeModel, ")."),
                            })];
                        case 6:
                            _a.sent();
                            if (!(body.submit && actor.userId !== body.ownerUserId)) return [3 /*break*/, 8];
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: body.ownerUserId,
                                    title: 'A bike was registered for you',
                                    body: "".concat(finalBike.name, " was added to your profile at the Protection Services desk."),
                                    kind: 'registration',
                                })];
                        case 7:
                            _a.sent();
                            _a.label = 8;
                        case 8: return [2 /*return*/, (0, views_1.toBikeView)(finalBike)];
                    }
                });
            }); });
            app.patch('/bikes/:bikeId', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, photoPath, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            body = updateBikeSchema.parse(request.body);
                            if (!body.photoDataUrl) return [3 /*break*/, 3];
                            return [4 /*yield*/, (0, uploads_1.savePhotoDataUrl)(body.photoDataUrl, 'bikes', bike.bikeId)];
                        case 2:
                            photoPath = _a.sent();
                            _a.label = 3;
                        case 3: return [4 /*yield*/, bikes_repo_1.bikesRepo.update(bike.bikeId, {
                                name: body.name,
                                makeModel: body.makeModel,
                                colour: body.colour,
                                photoPath: photoPath,
                            })];
                        case 4:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'registration.updated',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: "Details updated for ".concat(updated.name, "."),
                                })];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(updated)];
                    }
                });
            }); });
            app.post('/bikes/:bikeId/submit', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(bike.bikeId, 'pending_approval', {
                                    reviewNote: null,
                                    submittedAt: new Date(),
                                })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'registration.submitted',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: "".concat(updated.name, " submitted for review."),
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(updated)];
                    }
                });
            }); });
            app.post('/bikes/:bikeId/report-lost', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, tag, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _c.sent();
                            body = reportLostSchema.parse((_b = request.body) !== null && _b !== void 0 ? _b : {});
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findForBike(bike.bikeId)];
                        case 2:
                            tag = _c.sent();
                            if (!tag)
                                throw errors_1.ApiError.notFound('No active tag is linked to that bike.');
                            return [4 /*yield*/, tags_repo_1.tagsRepo.setStatus(tag.tagId, body.stolen ? 'stolen' : 'lost')];
                        case 3:
                            _c.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: body.stolen ? 'tag.reported_stolen' : 'tag.reported_lost',
                                    entityType: 'rfid_tag',
                                    entityId: tag.tagId,
                                    detail: "".concat(tag.tagRef, " flagged by the owner."),
                                })];
                        case 4:
                            _c.sent();
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: bike.ownerUserId,
                                    title: body.stolen ? 'Bike reported stolen' : 'Lost tag recorded',
                                    body: "Tag ".concat(tag.tagRef, " is flagged. Guards are alerted if it is presented at a gate. Collect a replacement from Protection Services."),
                                    kind: 'security',
                                })];
                        case 5:
                            _c.sent();
                            _a = views_1.toBikeView;
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(bike.bikeId)];
                        case 6: return [2 /*return*/, _a.apply(void 0, [(_c.sent())])];
                    }
                });
            }); });
            app.delete('/bikes/:bikeId', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, tag;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findForBike(bike.bikeId)];
                        case 2:
                            tag = _a.sent();
                            if (!(tag && tag.status !== 'deactivated')) return [3 /*break*/, 4];
                            return [4 /*yield*/, tags_repo_1.tagsRepo.setStatus(tag.tagId, 'deactivated', new Date())];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(bike.bikeId, 'removed')];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'registration.removed',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: "".concat(bike.name, " removed from the profile; tag deactivated."),
                                })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, reply.status(204).send()];
                    }
                });
            }); });
            app.post('/bikes/:bikeId/permissions', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, target, existing, _a, _b, _c;
                var _d;
                var _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, requireBikeAccess(request, request.params.bikeId)];
                        case 1:
                            bike = _g.sent();
                            body = grantPermissionSchema.parse(request.body);
                            return [4 /*yield*/, users_repo_1.usersRepo.findByStudentNumber(body.studentNumber)];
                        case 2:
                            target = _g.sent();
                            if (!target || target.role !== 'student') {
                                throw errors_1.ApiError.badRequest('No student matches that number.', 'studentNumber');
                            }
                            if (target.userId === bike.ownerUserId) {
                                throw errors_1.ApiError.badRequest('You already own this bike.', 'studentNumber');
                            }
                            return [4 /*yield*/, permissions_repo_1.permissionsRepo.findActive(bike.bikeId, target.userId)];
                        case 3:
                            existing = _g.sent();
                            if (existing)
                                throw errors_1.ApiError.conflict("".concat(target.name, " can already use this bike."), 'studentNumber');
                            return [4 /*yield*/, permissions_repo_1.permissionsRepo.create({ bikeId: bike.bikeId, authorisedUserId: target.userId, grantedBy: actor.userId })];
                        case 4:
                            _g.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'permission.granted',
                                    entityType: 'bike_permission',
                                    entityId: bike.bikeId,
                                    detail: "".concat(target.name, " authorised to use ").concat(bike.name, "."),
                                })];
                        case 5:
                            _g.sent();
                            _b = (_a = notifications_repo_1.notificationsRepo).create;
                            _d = {
                                userId: target.userId,
                                title: "You can use ".concat(bike.name)
                            };
                            _c = "".concat;
                            return [4 /*yield*/, users_repo_1.usersRepo.findById(bike.ownerUserId)];
                        case 6: return [4 /*yield*/, _b.apply(_a, [(_d.body = _c.apply("", [(_f = (_e = (_g.sent())) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : 'The owner', " authorised you to take this bike through the gate."]),
                                    _d.kind = 'registration',
                                    _d)])];
                        case 7:
                            _g.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(bike)];
                    }
                });
            }); });
            app.delete('/permissions/:permissionId', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, permission, bike;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireAuth();
                            return [4 /*yield*/, permissions_repo_1.permissionsRepo.findById(request.params.permissionId)];
                        case 1:
                            permission = _a.sent();
                            if (!permission)
                                throw errors_1.ApiError.notFound('That permission no longer exists.');
                            return [4 /*yield*/, requireBikeAccess(request, permission.bikeId)];
                        case 2:
                            bike = _a.sent();
                            return [4 /*yield*/, permissions_repo_1.permissionsRepo.revoke(permission.permissionId)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'permission.revoked',
                                    entityType: 'bike_permission',
                                    entityId: bike.bikeId,
                                    detail: 'Authorisation withdrawn.',
                                })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(bike)];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
