"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.toBikeView = toBikeView;
exports.toBikeViews = toBikeViews;
exports.toCrossingView = toCrossingView;
exports.toCrossingViews = toCrossingViews;
exports.buildAlarmView = buildAlarmView;
exports.toAlarmViewByAlarmId = toAlarmViewByAlarmId;
exports.requireUser = requireUser;
var alarms_repo_1 = require("../repositories/alarms.repo");
var bikes_repo_1 = require("../repositories/bikes.repo");
var events_repo_1 = require("../repositories/events.repo");
var gates_repo_1 = require("../repositories/gates.repo");
var permissions_repo_1 = require("../repositories/permissions.repo");
var tags_repo_1 = require("../repositories/tags.repo");
var users_repo_1 = require("../repositories/users.repo");
var db_1 = require("../db");
var errors_1 = require("../errors");
function toPermissionViews(bikeId) {
    return __awaiter(this, void 0, void 0, function () {
        var permissions;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, permissions_repo_1.permissionsRepo.listForBike(bikeId)];
                case 1:
                    permissions = _a.sent();
                    return [2 /*return*/, Promise.all(permissions.map(function (permission) { return __awaiter(_this, void 0, void 0, function () {
                            var user;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0: return [4 /*yield*/, users_repo_1.usersRepo.findById(permission.authorisedUserId)];
                                    case 1:
                                        user = _c.sent();
                                        return [2 /*return*/, __assign(__assign({}, permission), { authorisedUserName: (_a = user === null || user === void 0 ? void 0 : user.name) !== null && _a !== void 0 ? _a : 'Unknown student', authorisedStudentNumber: (_b = user === null || user === void 0 ? void 0 : user.studentStaffNumber) !== null && _b !== void 0 ? _b : '—' })];
                                }
                            });
                        }); }))];
            }
        });
    });
}
function toBikeView(bike) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, tag, owner, permissions;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        tags_repo_1.tagsRepo.findForBike(bike.bikeId),
                        users_repo_1.usersRepo.findById(bike.ownerUserId),
                        toPermissionViews(bike.bikeId),
                    ])];
                case 1:
                    _a = _b.sent(), tag = _a[0], owner = _a[1], permissions = _a[2];
                    if (!owner)
                        throw errors_1.ApiError.notFound('The owner of this bike no longer exists.');
                    return [2 /*return*/, { bike: bike, tag: tag, owner: owner, permissions: permissions }];
            }
        });
    });
}
function toBikeViews(bikes) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(bikes.map(toBikeView))];
        });
    });
}
function toCrossingView(event) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, gate, user, bike, alarm;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        gates_repo_1.gatesRepo.findById(event.gateId),
                        event.userId ? users_repo_1.usersRepo.findById(event.userId) : Promise.resolve(null),
                        event.bikeId ? bikes_repo_1.bikesRepo.findById(event.bikeId) : Promise.resolve(null),
                        alarms_repo_1.alarmsRepo.findByEventId(event.eventId),
                    ])];
                case 1:
                    _a = _g.sent(), gate = _a[0], user = _a[1], bike = _a[2], alarm = _a[3];
                    return [2 /*return*/, {
                            event: event,
                            gateName: (_b = gate === null || gate === void 0 ? void 0 : gate.name) !== null && _b !== void 0 ? _b : 'Unknown gate',
                            userName: (_c = user === null || user === void 0 ? void 0 : user.name) !== null && _c !== void 0 ? _c : null,
                            studentStaffNumber: (_d = user === null || user === void 0 ? void 0 : user.studentStaffNumber) !== null && _d !== void 0 ? _d : null,
                            bikeName: (_e = bike === null || bike === void 0 ? void 0 : bike.name) !== null && _e !== void 0 ? _e : null,
                            alarmStatus: (_f = alarm === null || alarm === void 0 ? void 0 : alarm.status) !== null && _f !== void 0 ? _f : null,
                        }];
            }
        });
    });
}
function toCrossingViews(events) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(events.map(toCrossingView))];
        });
    });
}
function findTagByRef(tagRef) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    return [4 /*yield*/, (0, db_1.query)('SELECT * FROM rfid_tags WHERE tag_ref = $1', [tagRef])];
                case 1:
                    rows = _a.sent();
                    row = rows[0];
                    if (!row)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            tagId: row.tag_id,
                            bikeId: row.bike_id,
                            tagRef: row.tag_ref,
                            status: row.status,
                            issuedAt: row.issued_at,
                            deactivatedAt: row.deactivated_at,
                            replacesTagId: row.replaces_tag_id,
                        }];
            }
        });
    });
}
function listActiveBikesForOwner(ownerUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var bikes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, bikes_repo_1.bikesRepo.listForOwner(ownerUserId)];
                case 1:
                    bikes = _a.sent();
                    return [2 /*return*/, bikes.filter(function (bike) { return bike.status === 'active'; })];
            }
        });
    });
}
function buildAlarmView(alarm) {
    return __awaiter(this, void 0, void 0, function () {
        var event, _a, gate, presentedUser, tag, tagBike, _b, registeredOwner, _c, ownerBikes, _d, resolvedByName, _e;
        var _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, events_repo_1.eventsRepo.findById(alarm.eventId)];
                case 1:
                    event = _j.sent();
                    if (!event)
                        throw errors_1.ApiError.notFound('The crossing behind this alarm no longer exists.');
                    return [4 /*yield*/, Promise.all([
                            gates_repo_1.gatesRepo.findById(event.gateId),
                            event.userId ? users_repo_1.usersRepo.findById(event.userId) : Promise.resolve(null),
                            event.tagRef ? findTagByRef(event.tagRef) : Promise.resolve(null),
                        ])];
                case 2:
                    _a = _j.sent(), gate = _a[0], presentedUser = _a[1], tag = _a[2];
                    if (!tag) return [3 /*break*/, 4];
                    return [4 /*yield*/, bikes_repo_1.bikesRepo.findById(tag.bikeId)];
                case 3:
                    _b = _j.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _b = null;
                    _j.label = 5;
                case 5:
                    tagBike = _b;
                    if (!tagBike) return [3 /*break*/, 7];
                    return [4 /*yield*/, users_repo_1.usersRepo.findById(tagBike.ownerUserId)];
                case 6:
                    _c = _j.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _c = null;
                    _j.label = 8;
                case 8:
                    registeredOwner = _c;
                    if (!presentedUser) return [3 /*break*/, 10];
                    return [4 /*yield*/, listActiveBikesForOwner(presentedUser.userId)];
                case 9:
                    _d = _j.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _d = [];
                    _j.label = 11;
                case 11:
                    ownerBikes = _d;
                    if (!alarm.resolvedByUserId) return [3 /*break*/, 13];
                    return [4 /*yield*/, users_repo_1.usersRepo.findById(alarm.resolvedByUserId)];
                case 12:
                    _e = (_g = (_f = (_j.sent())) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : null;
                    return [3 /*break*/, 14];
                case 13:
                    _e = null;
                    _j.label = 14;
                case 14:
                    resolvedByName = _e;
                    return [2 /*return*/, {
                            alarm: alarm,
                            event: event,
                            gateName: (_h = gate === null || gate === void 0 ? void 0 : gate.name) !== null && _h !== void 0 ? _h : 'Unknown gate',
                            presentedUser: presentedUser,
                            registeredOwner: registeredOwner,
                            tagBike: tagBike,
                            ownerBikes: ownerBikes,
                            resolvedByName: resolvedByName,
                        }];
            }
        });
    });
}
function toAlarmViewByAlarmId(alarmId) {
    return __awaiter(this, void 0, void 0, function () {
        var alarm;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, alarms_repo_1.alarmsRepo.findById(alarmId)];
                case 1:
                    alarm = _a.sent();
                    if (!alarm)
                        throw errors_1.ApiError.notFound('That alarm has already been closed.');
                    return [2 /*return*/, buildAlarmView(alarm)];
            }
        });
    });
}
function requireUser(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, users_repo_1.usersRepo.findById(userId)];
                case 1:
                    user = _a.sent();
                    if (!user)
                        throw errors_1.ApiError.notFound('That user no longer exists.');
                    return [2 /*return*/, user];
            }
        });
    });
}
