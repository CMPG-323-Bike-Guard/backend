"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
function required(name, fallback) {
    var _a;
    var value = (_a = process.env[name]) !== null && _a !== void 0 ? _a : fallback;
    if (value === undefined) {
        throw new Error("Missing required environment variable: ".concat(name));
    }
    return value;
}
exports.config = {
    nodeEnv: (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : 'development',
    isProduction: process.env.NODE_ENV === 'production',
    port: Number((_b = process.env.PORT) !== null && _b !== void 0 ? _b : 3000),
    host: (_c = process.env.HOST) !== null && _c !== void 0 ? _c : '0.0.0.0',
    apiPrefix: (_d = process.env.API_PREFIX) !== null && _d !== void 0 ? _d : '/api/v1',
    publicOrigin: (_e = process.env.PUBLIC_ORIGIN) !== null && _e !== void 0 ? _e : "http://localhost:".concat(Number((_f = process.env.PORT) !== null && _f !== void 0 ? _f : 3000)),
    databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/bikeguard'),
    jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
    jwtExpiresIn: (_g = process.env.JWT_EXPIRES_IN) !== null && _g !== void 0 ? _g : '12h',
    hmacSecret: required('HMAC_SECRET', 'dev-hmac-pepper-change-me'),
    corsOrigin: (_h = process.env.CORS_ORIGIN) !== null && _h !== void 0 ? _h : '*',
    uploadsDir: (_j = process.env.UPLOADS_DIR) !== null && _j !== void 0 ? _j : 'uploads',
    publicUploadsPath: (_k = process.env.PUBLIC_UPLOADS_PATH) !== null && _k !== void 0 ? _k : '/uploads',
    mqttUrl: process.env.MQTT_URL,
    mqttUsername: process.env.MQTT_USERNAME,
    mqttPassword: process.env.MQTT_PASSWORD,
    mqttTopicPrefix: (_l = process.env.MQTT_TOPIC_PREFIX) !== null && _l !== void 0 ? _l : 'bikeguard/gates',
    verificationTimeoutMs: Number((_m = process.env.VERIFICATION_TIMEOUT_MS) !== null && _m !== void 0 ? _m : 800),
    scanDebounceMs: Number((_o = process.env.SCAN_DEBOUNCE_MS) !== null && _o !== void 0 ? _o : 3000),
    gateMasterSecret: required('GATE_MASTER_SECRET', 'dev-gate-secret-change-me'),
    gateSigningRequired: process.env.GATE_SIGNING_REQUIRED
        ? process.env.GATE_SIGNING_REQUIRED === 'true'
        : process.env.NODE_ENV === 'production',
    gateMaxSkewMs: Number((_p = process.env.GATE_MAX_SKEW_MS) !== null && _p !== void 0 ? _p : 30000),
    gateOfflineAfterMs: Number((_q = process.env.GATE_OFFLINE_AFTER_MS) !== null && _q !== void 0 ? _q : 30000),
    gateWatchdogIntervalMs: Number((_r = process.env.GATE_WATCHDOG_INTERVAL_MS) !== null && _r !== void 0 ? _r : 10000),
    loginRateLimitMax: Number((_s = process.env.LOGIN_RATE_LIMIT_MAX) !== null && _s !== void 0 ? _s : 5),
    loginRateLimitWindow: (_t = process.env.LOGIN_RATE_LIMIT_WINDOW) !== null && _t !== void 0 ? _t : '1 minute',
    trustProxy: process.env.TRUST_PROXY === 'true',
};
if (exports.config.isProduction) {
    var insecureDefaults = [
        ['JWT_SECRET', exports.config.jwtSecret, 'dev-secret-change-me'],
        ['HMAC_SECRET', exports.config.hmacSecret, 'dev-hmac-pepper-change-me'],
        ['GATE_MASTER_SECRET', exports.config.gateMasterSecret, 'dev-gate-secret-change-me'],
    ];
    var unsafe = insecureDefaults.filter(function (_a) {
        var value = _a[1], fallback = _a[2];
        return value === fallback;
    }).map(function (_a) {
        var name = _a[0];
        return name;
    });
    if (unsafe.length > 0) {
        throw new Error("Refusing to start in production with default values for: ".concat(unsafe.join(', ')));
    }
}
;
