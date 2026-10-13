import { buildApp } from './app';
import { config } from './config';
import { initRealtime } from './realtime';
import { startGateBridge } from './mqtt';
import { startAlarmEscalationJob } from './services/alarm-escalation';

async function main() {
  const app = await buildApp();
  await app.ready();

  initRealtime(app.server);
  startGateBridge(app.log);
  startAlarmEscalationJob((err) => app.log.error({ err }, 'Alarm escalation job failed'));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`BikeGuard API listening on ${config.host}:${config.port}`);
}

main().catch((err) => {

  console.error('Fatal error starting BikeGuard API', err);
  process.exit(1);
});
