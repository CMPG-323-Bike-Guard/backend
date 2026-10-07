import mqtt from 'mqtt';
import { z } from 'zod';
import type { FastifyBaseLogger } from 'fastify';
import { config } from './config';
import { ApiError } from './errors';
import { verifyPayload } from './gate-auth';
import { gatesRepo } from './repositories/gates.repo';
import { emitRealtime } from './realtime';
import { startGateWatchdog, recordHeartbeat } from './services/gate-watchdog';
import { processCrossing } from './services/verification';

const payloadSchema = z.object({
  studentNumber: z.string().nullable().optional(),
  tagUid: z.string().nullable().optional(),
  ts: z.number().optional(),
  sig: z.string().optional(),
});

const uuidSchema = z.string().uuid();

export function startGateBridge(log: FastifyBaseLogger): void {
  if (!config.mqttUrl) {
    log.info('MQTT_URL not set — gate bridge disabled (REST /dev/simulate-crossing still works).');
    return;
  }

  const client = mqtt.connect(config.mqttUrl, {
    username: config.mqttUsername,
    password: config.mqttPassword,
    reconnectPeriod: 2000,
  });

  const prefix = config.mqttTopicPrefix;
  const scanTopic = `${prefix}/+/scan`;
  const heartbeatTopic = `${prefix}/+/heartbeat`;

  startGateWatchdog((err) => log.error({ err }, 'Gate watchdog check failed'));

  client.on('connect', () => {
    log.info(`Gate bridge connected to MQTT broker, subscribing to ${scanTopic} and ${heartbeatTopic}`);
    client.subscribe([scanTopic, heartbeatTopic]);
  });

  client.on('message', async (topic, raw) => {
    const parts = topic.split('/');
    const kind = parts[parts.length - 1];
    const gateId = parts[parts.length - 2];

    if (!uuidSchema.safeParse(gateId).success) {
      log.warn({ topic }, 'Gate bridge ignored a message for a malformed gate id.');
      return;
    }

    let payload: z.infer<typeof payloadSchema>;
    try {
      payload = payloadSchema.parse(JSON.parse(raw.toString()));
    } catch {
      log.warn({ gateId }, 'Gate bridge ignored a malformed payload.');
      return;
    }

    if (!verifyPayload(gateId, payload)) {
      log.warn({ gateId, kind }, 'Gate bridge rejected a message with a bad, stale or replayed signature.');
      return;
    }

    recordHeartbeat(gateId);
    if (kind === 'heartbeat') return;

    const decisionTopic = `${prefix}/${gateId}/decision`;
    try {
      const outcome = await processCrossing({
        gateId,
        studentNumber: payload.studentNumber,
        tagUid: payload.tagUid,
        source: 'automated',
      });
      client.publish(
        decisionTopic,
        JSON.stringify({ open: outcome.gateShouldOpen, eventId: outcome.crossing.event.eventId }),
      );
    } catch (err) {
      client.publish(decisionTopic, JSON.stringify({ open: false, eventId: null }));

      if (err instanceof ApiError) {
        log.warn({ gateId, code: err.code }, 'Gate bridge could not verify a scan.');
        return;
      }

      log.error({ err, gateId }, 'Gate bridge failed to process a scan — falling back the lane to manual mode.');
      const failed = await gatesRepo.setMode(gateId, 'manual', 'error', new Date()).catch(() => null);
      if (failed) emitRealtime({ type: 'gate', gate: failed });
    }
  });

  client.on('error', (err) => log.error({ err }, 'MQTT client error'));
}