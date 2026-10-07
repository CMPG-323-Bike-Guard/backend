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
var db_1 = require("../src/db");
var security_1 = require("../src/security");
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        function makeUser(studentNumber, name, email, role) {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, db_1.query)("INSERT INTO users (student_number, name, email, role, password_hash)\n       VALUES ($1,$2,$3,$4,$5) RETURNING user_id", [studentNumber, name, email, role, passwordHash])];
                        case 1:
                            row = (_a.sent())[0];
                            return [2 /*return*/, row.user_id];
                    }
                });
            });
        }
        var existing, passwordHash, thabo, lerato, guard, admin, gate1, bikeActive, activeTagHmac;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!process.argv.includes('--reset')) return [3 /*break*/, 2];
                    console.log('Clearing existing data...');
                    return [4 /*yield*/, (0, db_1.query)('TRUNCATE users, gates, bikes CASCADE')];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, (0, db_1.query)('SELECT 1 FROM users WHERE student_number = $1', ['90003344'])];
                case 3:
                    existing = _a.sent();
                    if (existing.length > 0) {
                        console.log('Dev data is already seeded. Run "npm run seed:reset" to wipe and reseed.');
                        return [2 /*return*/];
                    }
                    console.log('Seeding BikeGuard dev data...');
                    return [4 /*yield*/, (0, security_1.hashPassword)('Password123!')];
                case 4:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, makeUser('30112233', 'Thabo Mokoena', 'thabo.mokoena@student.nwu.ac.za', 'student')];
                case 5:
                    thabo = _a.sent();
                    return [4 /*yield*/, makeUser('30112244', 'Lerato Dube', 'lerato.dube@student.nwu.ac.za', 'student')];
                case 6:
                    lerato = _a.sent();
                    return [4 /*yield*/, makeUser('90001122', 'Sipho Nkosi', 'sipho.nkosi@nwu.ac.za', 'guard')];
                case 7:
                    guard = _a.sent();
                    return [4 /*yield*/, makeUser('90003344', 'Anja van der Merwe', 'anja.vandermerwe@nwu.ac.za', 'admin')];
                case 8:
                    admin = _a.sent();
                    return [4 /*yield*/, (0, db_1.query)("INSERT INTO gates (name, location, health, commissioned, mode) VALUES ($1,$2,'good',true,'automated') RETURNING gate_id", ['Gate 1 — Building G16', 'Building G16, east entrance'])];
                case 9:
                    gate1 = (_a.sent())[0];
                    return [4 /*yield*/, (0, db_1.query)("INSERT INTO gates (name, location, health, commissioned, mode) VALUES ($1,$2,'good',true,'automated')", [
                            'Gate 2 — Res Village',
                            'Res Village main boom',
                        ])];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, (0, db_1.query)("INSERT INTO bikes (owner_user_id, name, make_model, colour, status, reviewed_at)\n     VALUES ($1,'Thabo''s commuter','Silverback Scoop','Matte black','active', now()) RETURNING bike_id", [thabo])];
                case 11:
                    bikeActive = (_a.sent())[0];
                    activeTagHmac = (0, security_1.hmacIdentifier)('TAG-RAW-0001');
                    return [4 /*yield*/, (0, db_1.query)("INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status) VALUES ($1,$2,$3,'active')", [
                            bikeActive.bike_id,
                            activeTagHmac,
                            (0, security_1.displayRef)('BG', activeTagHmac),
                        ])];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, (0, db_1.query)("INSERT INTO bikes (owner_user_id, name, make_model, colour, status) VALUES ($1,'Lerato''s campus bike','Titan Track','Teal','pending_approval')", [lerato])];
                case 13:
                    _a.sent();
                    console.log('Seed complete. Sample logins (password: Password123!):');
                    console.log('  student: 30112233 (Thabo Mokoena)');
                    console.log('  student: 30112244 (Lerato Dube)');
                    console.log('  guard:   90001122 (Sipho Nkosi)');
                    console.log('  admin:   90003344 (Anja van der Merwe)');
                    void gate1;
                    void admin;
                    void guard;
                    return [2 /*return*/];
            }
        });
    });
}
(0, db_1.withTransaction)(seed)
    .catch(function (err) {
    console.error(err);
    process.exitCode = 1;
})
    .finally(function () { return db_1.pool.end(); });
