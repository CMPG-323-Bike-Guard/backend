import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',

  apiPrefix: process.env.API_PREFIX ?? '/api/v1',

  publicOrigin: process.env.PUBLIC_ORIGIN ?? `http://localhost:${Number(process.env.PORT ?? 3000)}`,

  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/bikeguard'),

  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',

  hmacSecret: required('HMAC_SECRET', 'dev-hmac-pepper-change-me'),

  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  publicUploadsPath: process.env.PUBLIC_UPLOADS_PATH ?? '/uploads',
  photoStorage: process.env.PHOTO_STORAGE === 'db' ? 'db' : 'disk',

  mqttUrl: process.env.MQTT_URL,
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX ?? 'bikeguard/gates',

  verificationTimeoutMs: Number(process.env.VERIFICATION_TIMEOUT_MS ?? 800),

    scanDebounceMs: Number(process.env.SCAN_DEBOUNCE_MS ?? 3000),

  simulatorEnabled: process.env.ENABLE_SIMULATOR
  ? process.env.ENABLE_SIMULATOR === 'true'
  : process.env.NODE_ENV !== 'production',
  alarmAckTimeoutMs: Number(process.env.ALARM_ACK_TIMEOUT_MS ?? 120_000),
  alarmEscalationIntervalMs: Number(process.env.ALARM_ESCALATION_INTERVAL_MS ?? 5_000),
  gateMasterSecret: required('GATE_MASTER_SECRET', 'dev-gate-secret-change-me'),
  gateSigningRequired: process.env.GATE_SIGNING_REQUIRED
    ? process.env.GATE_SIGNING_REQUIRED === 'true'
    : process.env.NODE_ENV === 'production',
  gateMaxSkewMs: Number(process.env.GATE_MAX_SKEW_MS ?? 30_000),
  gateOfflineAfterMs: Number(process.env.GATE_OFFLINE_AFTER_MS ?? 30_000),
  gateWatchdogIntervalMs: Number(process.env.GATE_WATCHDOG_INTERVAL_MS ?? 10_000),

  loginRateLimitMax: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5),
  loginRateLimitWindow: process.env.LOGIN_RATE_LIMIT_WINDOW ?? '1 minute',
  trustProxy: process.env.TRUST_PROXY === 'true',

    cardBridgeKey: process.env.CARD_BRIDGE_KEY ?? '',
};

if (config.isProduction) {
  const insecureDefaults: Array<[string, string, string]> = [
    ['JWT_SECRET', config.jwtSecret, 'dev-secret-change-me'],
    ['HMAC_SECRET', config.hmacSecret, 'dev-hmac-pepper-change-me'],
    ['GATE_MASTER_SECRET', config.gateMasterSecret, 'dev-gate-secret-change-me'],
  ];
  const unsafe = insecureDefaults.filter(([, value, fallback]) => value === fallback).map(([name]) => name);
  if (unsafe.length > 0) {
    throw new Error(`Refusing to start in production with default values for: ${unsafe.join(', ')}`);
  }
};
