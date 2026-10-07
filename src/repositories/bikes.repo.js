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
exports.bikesRepo = void 0;
var db_1 = require("../db");
function toBike(row) {
    return {
        bikeId: row.bike_id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        makeModel: row.make_model,
        colour: row.colour,
        photoPath: row.photo_path,
        status: row.status,
        submittedAt: new Date(row.submitted_at).toISOString(),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
        reviewNote: row.review_note,
    };
}
exports.bikesRepo = {
    findById: function (bikeId) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)('SELECT * FROM bikes WHERE bike_id = $1', [bikeId])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toBike(row) : null];
                }
            });
        });
    },
    listForOwner: function (ownerUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.query)('SELECT * FROM bikes WHERE owner_user_id = $1 ORDER BY submitted_at DESC', [ownerUserId])];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(toBike)];
                }
            });
        });
    },
    listByStatus: function (status) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!status) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, db_1.query)('SELECT * FROM bikes WHERE status = $1 ORDER BY submitted_at DESC', [status])];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, db_1.query)('SELECT * FROM bikes ORDER BY submitted_at DESC')];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        rows = _a;
                        return [2 /*return*/, rows.map(toBike)];
                }
            });
        });
    },
    listActive: function () {
        return __awaiter(this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.query)("SELECT * FROM bikes WHERE status = 'active'")];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(toBike)];
                }
            });
        });
    },
    create: function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.queryOne)("INSERT INTO bikes (owner_user_id, name, make_model, colour, photo_path, status)\n       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [input.ownerUserId, input.name, input.makeModel, input.colour, input.photoPath, input.status])];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, toBike(row)];
                }
            });
        });
    },
    update: function (bikeId, fields) {
        return __awaiter(this, void 0, void 0, function () {
            var sets, params, i, row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sets = [];
                        params = [];
                        i = 1;
                        if (fields.name !== undefined) {
                            sets.push("name = $".concat(i++));
                            params.push(fields.name);
                        }
                        if (fields.makeModel !== undefined) {
                            sets.push("make_model = $".concat(i++));
                            params.push(fields.makeModel);
                        }
                        if (fields.colour !== undefined) {
                            sets.push("colour = $".concat(i++));
                            params.push(fields.colour);
                        }
                        if (fields.photoPath !== undefined) {
                            sets.push("photo_path = $".concat(i++));
                            params.push(fields.photoPath);
                        }
                        if (sets.length === 0)
                            return [2 /*return*/, this.findById(bikeId)];
                        params.push(bikeId);
                        return [4 /*yield*/, (0, db_1.queryOne)("UPDATE bikes SET ".concat(sets.join(', '), " WHERE bike_id = $").concat(i, " RETURNING *"), params)];
                    case 1:
                        row = _a.sent();
                        return [2 /*return*/, row ? toBike(row) : null];
                }
            });
        });
    },
    setStatus: function (bikeId_1, status_1) {
        return __awaiter(this, arguments, void 0, function (bikeId, status, extra) {
            var sets, params, i, row;
            var _a, _b;
            if (extra === void 0) { extra = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sets = ['status = $1'];
                        params = [status];
                        i = 2;
                        if ('reviewedAt' in extra) {
                            sets.push("reviewed_at = $".concat(i++));
                            params.push((_a = extra.reviewedAt) !== null && _a !== void 0 ? _a : null);
                        }
                        if ('reviewNote' in extra) {
                            sets.push("review_note = $".concat(i++));
                            params.push((_b = extra.reviewNote) !== null && _b !== void 0 ? _b : null);
                        }
                        if (extra.submittedAt) {
                            sets.push("submitted_at = $".concat(i++));
                            params.push(extra.submittedAt);
                        }
                        params.push(bikeId);
                        return [4 /*yield*/, (0, db_1.queryOne)("UPDATE bikes SET ".concat(sets.join(', '), " WHERE bike_id = $").concat(i, " RETURNING *"), params)];
                    case 1:
                        row = _c.sent();
                        return [2 /*return*/, row ? toBike(row) : null];
                }
            });
        });
    },
};
