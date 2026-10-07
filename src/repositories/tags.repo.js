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
exports.tagsRepo = void 0;
var db_1 = require("../db");
function toTag(row) {
    return {
        tagId: row.tag_id,
        bikeId: row.bike_id,
        tagRef: row.tag_ref,
        status: row.status,
        issuedAt: row.issued_at ? new Date(row.issued_at).toISOString() : null,
        deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at).toISOString() : null,
        replacesTagId: row.replaces_tag_id,
    };
}
var COLUMNS = 'tag_id, bike_id, tag_ref, status, issued_at, deactivated_at, replaces_tag_id';
exports.tagsRepo = {
    findById: function (tagId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("SELECT ".concat(COLUMNS, " FROM rfid_tags WHERE tag_id = $1"), [tagId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toTag(row) : null];
                }
            });
        });
    },
    findForBike: function (bikeId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("SELECT ".concat(COLUMNS, " FROM rfid_tags WHERE bike_id = $1\n       ORDER BY (status <> 'deactivated') DESC, issued_at DESC LIMIT 1"), [bikeId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toTag(row) : null];
                }
            });
        });
    },
    findByHmac: function (tagHmac) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("SELECT ".concat(COLUMNS, " FROM rfid_tags WHERE tag_hmac = $1"), [tagHmac])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toTag(row) : null];
                }
            });
        });
    },
    findLiveByHmac: function (tagHmac) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("SELECT ".concat(COLUMNS, " FROM rfid_tags WHERE tag_hmac = $1 AND status <> 'deactivated'"), [tagHmac])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toTag(row) : null];
                }
            });
        });
    },
    create: function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status, replaces_tag_id)\n       VALUES ($1, $2, $3, $4, $5) RETURNING ".concat(COLUMNS), [input.bikeId, input.tagHmac, input.tagRef, input.status, (_a = input.replacesTagId) !== null && _a !== void 0 ? _a : null])];
                    case 1:
                        row = _b.sent();
                        return [2 /*return*/, toTag(row)];
                }
            });
        });
    },
    setStatus: function (tagId, status, deactivatedAt) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("UPDATE rfid_tags SET status = $1, deactivated_at = $2 WHERE tag_id = $3 RETURNING ".concat(COLUMNS), [status, deactivatedAt !== null && deactivatedAt !== void 0 ? deactivatedAt : null, tagId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toTag(row) : null];
                }
            });
        });
    },
    listByBikeIds: function (bikeIds) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (bikeIds.length === 0)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, (0, db_1.query)("SELECT ".concat(COLUMNS, " FROM rfid_tags WHERE bike_id = ANY($1::uuid[])"), [bikeIds])];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(toTag)];
                }
            });
        });
    },
};
