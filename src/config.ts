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

  mqttUrl: process.env.MQTT_URL,
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX ?? 'bikeguard/gates',

  verificationTimeoutMs: Number(process.env.VERIFICATION_TIMEOUT_MS ?? 800),
};
