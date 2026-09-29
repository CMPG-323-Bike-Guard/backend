import { buildApp } from './app';
import { config } from './config';
import { initRealtime } from './realtime';
import { startGateBridge } from './mqtt';

async function main() {
  const app = await buildApp();
  await app.ready();

  initRealtime(app.server);
  startGateBridge(app.log);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`BikeGuard API listening on ${config.host}:${config.port}`);
}

main().catch((err) => {

  console.error('Fatal error starting BikeGuard API', err);
  process.exit(1);
});
