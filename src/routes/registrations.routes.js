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
exports.default = registrationsRoutes;
var zod_1 = require("zod");
var errors_1 = require("../errors");
var audit_repo_1 = require("../repositories/audit.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var notifications_repo_1 = require("../repositories/notifications.repo");
var tags_repo_1 = require("../repositories/tags.repo");
var security_1 = require("../security");
var views_1 = require("../services/views");
var approveSchema = zod_1.z.object({ tagRef: zod_1.z.string().min(1, 'Enter the tag ID to allocate.') });
var rejectSchema = zod_1.z.object({ reason: zod_1.z.string().min(1, 'Give a reason for the student.') });
function registrationsRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            app.get('/registrations', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var bikes;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request.requireRole('admin');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.listByStatus(request.query.status)];
                        case 1:
                            bikes = _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeViews)(bikes)];
                    }
                });
            }); });
            app.post('/registrations/:bikeId/approve', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, tagHmac, clash, tagRef, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            if (!bike)
                                throw errors_1.ApiError.notFound('That registration no longer exists.');
                            body = approveSchema.parse(request.body);
                            tagHmac = (0, security_1.hmacIdentifier)(body.tagRef);
                            return [4 /*yield*/, tags_repo_1.tagsRepo.findLiveByHmac(tagHmac)];
                        case 2:
                            clash = _a.sent();
                            if (clash)
                                throw errors_1.ApiError.conflict("That tag is already issued to another bike.", 'tagRef');
                            tagRef = (0, security_1.displayRef)('BG', tagHmac);
                            return [4 /*yield*/, tags_repo_1.tagsRepo.create({ bikeId: bike.bikeId, tagHmac: tagHmac, tagRef: tagRef, status: 'awaiting_collection' })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(bike.bikeId, 'tag_pending', { reviewedAt: new Date(), reviewNote: null })];
                        case 4:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'registration.approved',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: "Approved and tag ".concat(tagRef, " allocated."),
                                })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: bike.ownerUserId,
                                    title: 'Your tag is ready to collect',
                                    body: "Tag ".concat(tagRef, " for \"").concat(bike.name, "\" is ready at the Protection Services desk. Bring your student card."),
                                    kind: 'tag_ready',
                                })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(updated)];
                    }
                });
            }); });
            app.post('/registrations/:bikeId/reject', function (request) { return __awaiter(_this, void 0, void 0, function () {
                var actor, bike, body, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            actor = request.requireRole('admin');
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(request.params.bikeId)];
                        case 1:
                            bike = _a.sent();
                            if (!bike)
                                throw errors_1.ApiError.notFound('That registration no longer exists.');
                            body = rejectSchema.parse(request.body);
                            return [4 /*yield*/, bikes_repo_1.bikesRepo.setStatus(bike.bikeId, 'rejected', {
                                    reviewedAt: new Date(),
                                    reviewNote: body.reason.trim(),
                                })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, audit_repo_1.auditRepo.record({
                                    actorUserId: actor.userId,
                                    action: 'registration.rejected',
                                    entityType: 'bike',
                                    entityId: bike.bikeId,
                                    detail: body.reason.trim(),
                                })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, notifications_repo_1.notificationsRepo.create({
                                    userId: bike.ownerUserId,
                                    title: "".concat(bike.name, " needs another look"),
                                    body: body.reason.trim(),
                                    kind: 'registration',
                                })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, (0, views_1.toBikeView)(updated)];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
