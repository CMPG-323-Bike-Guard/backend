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
exports.default = tagsRoutes;
var zod_1 = require("zod");
var errors_1 = require("../errors");
var audit_repo_1 = require("../repositories/audit.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var notifications_repo_1 = require("../repositories/notifications.repo");
var tags_repo_1 = require("../repositories/tags.repo");
var security_1 = require("../security");
var views_1 = require("../services/views");
var deactivateSchema = zod_1.z.object({ reason: zod_1.z.string().default('') });
var replaceSchema = zod_1.z.object({ tagRef: zod_1.z.string().min(1, 'Enter the new tag ID.') });
function tagsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.post('/tags/:tagId/collect', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, tag, bike;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findById(request.params.tagId)];
                        case 1:
                            tag = _a.sent();
                            if (!tag)
                                throw errors_1.ApiError.notFound('That tag no longer exists.');
                            return [4 /*yield*/, tags_repo_1.tagsRepo.setStatus(tag.tagId, 'active')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(tag.bikeId, 'active')];
                        case 3:
                            bike = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'tag.collected',
                                    entityType: 'rfid_tag',
                                    entityId: tag.tagId,
                                    detail: "".concat(tag.tagRef, " collected and fitted to ").concat(bike.name, "."),
                                })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: bike.ownerUserId,
                                    title: "".concat(bike.name, " is protected"),
                                    body: 'Tap your card at the pilot gate and the boom lifts automatically.',
                                    kind: 'registration',
                                })];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(bike)];
                    }
                });
            }); });
            app.post('/tags/:tagId/deactivate', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, tag, body, bike;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findById(request.params.tagId)];
                        case 1:
                            tag = _b.sent();
                            if (!tag)
                                throw errors_1.ApiError.notFound('That tag no longer exists.');
                            body = deactivateSchema.parse((_a = request.body) !== null && _a !== void 0 ? _a : {});
                            return [4 /*yield*/, tags_repo_1.tagsRepo.setStatus(tag.tagId, 'deactivated', new Date())];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(tag.bikeId, 'tag_pending')];
                        case 3:
                            bike = _b.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'tag.deactivated',
                                    entityType: 'rfid_tag',
                                    entityId: tag.tagId,
                                    detail: "".concat(tag.tagRef, " deactivated: ").concat(body.reason.trim() || 'no reason given', "."),
                                })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(bike)];
                    }
                });
            }); });
            app.post('/bikes/:bikeId/tag', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, tagHmac, clash, previous, tagRef, updated;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(request.params.bikeId)];
                        case 1:
                            bike = _c.sent();
                            if (!bike)
                                throw errors_1.ApiError.notFound('That bike no longer exists.');
                            body = replaceSchema.parse(request.body);
                            tagHmac = (0, security_1.hmacIdentifier)(body.tagRef);
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findLiveByHmac(tagHmac)];
                        case 2:
                            clash = _c.sent();
                            if (clash)
                                throw errors_1.ApiError.conflict('That tag is already issued.', 'tagRef');
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findForBike(bike.bikeId)];
                        case 3:
                            previous = _c.sent();
                            if (!previous) return [3 /*break*/, 5];
                            return [4 /*yield*/, tags_repo_1.tagsRepo.setStatus(previous.tagId, 'deactivated', new Date())];
                        case 4:
                            _c.sent();
                            _c.label = 5;
                        case 5:
                            tagRef = (0, security_1.displayRef)('BG', tagHmac);
                            return [4 /*yield*/, tags_repo_1.tagsRepo.create({
                                    bikeId: bike.bikeId,
                                    tagHmac: tagHmac,
                                    tagRef: tagRef,
                                    status: 'awaiting_collection',
                                    replacesTagId: (_a = previous === null || previous === void 0 ? void 0 : previous.tagId) !== null && _a !== void 0 ? _a : null,
                                })];
                        case 6:
                            _c.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(bike.bikeId, 'tag_pending')];
                        case 7:
                            updated = _c.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'tag.replaced',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: "".concat((_b = previous === null || previous === void 0 ? void 0 : previous.tagRef) !== null && _b !== void 0 ? _b : 'previous tag', " replaced by ").concat(tagRef, ". Registration history retained."),
                                })];
                        case 8:
                            _c.sent();
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: bike.ownerUserId,
                                    title: 'Replacement tag ready to collect',
                                    body: "Tag ".concat(tagRef, " is ready at the Protection Services desk. Your registration history is unchanged."),
                                    kind: 'tag_ready',
                                })];
                        case 9:
                            _c.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(updated)];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
