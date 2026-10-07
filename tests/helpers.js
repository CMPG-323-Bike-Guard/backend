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
exports.resetDb = resetDb;
exports.makeUser = makeUser;
exports.makeGate = makeGate;
exports.makeBike = makeBike;
exports.makeTag = makeTag;
exports.countRows = countRows;
var db_1 = require("../src/db");
var gate_auth_1 = require("../src/gate-auth");
var security_1 = require("../src/security");
var gate_watchdog_1 = require("../src/services/gate-watchdog");
var verification_1 = require("../src/services/verification");
function resetDb() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)('TRUNCATE users, gates, bikes CASCADE')];
                case 1:
                    _a.sent();
                    (0, verification_1.clearRecentScans)();
                    (0, gate_auth_1.resetGateAuthState)();
                    (0, gate_watchdog_1.resetWatchdogState)();
                    return [2 /*return*/];
            }
        });
    });
}
function makeUser(studentNumber_1) {
    return __awaiter(this, arguments, void 0, function (studentNumber, role, password) {
        var rows, _a, _b, _c;
        if (role === void 0) { role = 'student'; }
        if (password === void 0) { password = 'Password123!'; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = db_1.query;
                    _b = ["INSERT INTO users (student_number, name, email, role, password_hash)\n     VALUES ($1, $2, $3, $4, $5) RETURNING user_id"];
                    _c = [studentNumber, "User ".concat(studentNumber), "".concat(studentNumber, "@test.nwu.ac.za"), role];
                    return [4 /*yield*/, (0, security_1.hashPassword)(password)];
                case 1: return [4 /*yield*/, _a.apply(void 0, _b.concat([_c.concat([_d.sent()])]))];
                case 2:
                    rows = _d.sent();
                    return [2 /*return*/, rows[0].user_id];
            }
        });
    });
}
function makeGate() {
    return __awaiter(this, arguments, void 0, function (mode) {
        var rows;
        if (mode === void 0) { mode = 'automated'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("INSERT INTO gates (name, location, health, commissioned, mode)\n     VALUES ($1, 'Test location', 'good', true, $2) RETURNING gate_id", ["Test gate ".concat(Math.random().toString(36).slice(2, 7)), mode])];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, rows[0].gate_id];
            }
        });
    });
}
function makeBike(ownerId) {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("INSERT INTO bikes (owner_user_id, name, make_model, colour, status, reviewed_at)\n     VALUES ($1, 'Test bike', 'Model', 'Red', 'active', now()) RETURNING bike_id", [ownerId])];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, rows[0].bike_id];
            }
        });
    });
}
function makeTag(bikeId_1, uid_1) {
    return __awaiter(this, arguments, void 0, function (bikeId, uid, status) {
        var hmac;
        if (status === void 0) { status = 'active'; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hmac = (0, security_1.hmacIdentifier)(uid);
                    return [4 /*yield*/, (0, db_1.query)('INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status) VALUES ($1, $2, $3, $4)', [
                            bikeId,
                            hmac,
                            (0, security_1.displayRef)('BG', hmac),
                            status,
                        ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function countRows(table) {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.query)("SELECT count(*) AS n FROM ".concat(table))];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, Number(rows[0].n)];
            }
        });
    });
}
