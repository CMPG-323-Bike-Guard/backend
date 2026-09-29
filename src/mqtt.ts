import mqtt from 'mqtt';
import type { FastifyBaseLogger } from 'fastify';
import { config } from './config';
import { gatesRepo } from './repositories/gates.repo';
import { emitRealtime } from './realtime';
import { processCrossing } from './services/verification';

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

  const scanTopic = `${config.mqttTopicPrefix}/+/scan`;

  client.on('connect', () => {
    log.info(`Gate bridge connected to MQTT broker, subscribing to ${scanTopic}`);
    client.subscribe(scanTopic);
  });

  client.on('message', async (topic, payload) => {
    const gateId = topic.split('/')[topic.split('/').length - 2];
    try {
      const { cardUid, tagUid } = JSON.parse(payload.toString()) as { cardUid?: string | null; tagUid?: string | null };
      const outcome = await processCrossing({ gateId, cardUid, tagUid, source: 'automated' });
      client.publish(
        `${config.mqttTopicPrefix}/${gateId}/decision`,
        JSON.stringify({ open: outcome.gateShouldOpen, eventId: outcome.crossing.event.eventId }),
      );
    } catch (err) {
      log.error({ err, gateId }, 'Gate bridge failed to process a scan — falling back the lane to manual mode.');

      const failed = await gatesRepo.setMode(gateId, 'manual', 'error', new Date()).catch(() => null);
      if (failed) emitRealtime({ type: 'gate', gate: failed });
    }
  });

  client.on('error', (err) => log.error({ err }, 'MQTT client error'));
}
