import mqtt from 'mqtt';
import { config } from '../src/config';
import { signPayload } from '../src/gate-auth';

const [gateId, cardArg, tagArg] = process.argv.slice(2);

if (!gateId) {
  console.error('Usage: npm run fake-reader -- <gateId> [studentNumber|-] [tagUid|-] [--heartbeat] [--unsigned]');
  process.exit(1);
}

const studentNumber = !cardArg || cardArg === '-' || cardArg.startsWith('--') ? null : cardArg;
const tagUid = !tagArg || tagArg === '-' || tagArg.startsWith('--') ? null : tagArg;
const heartbeat = process.argv.includes('--heartbeat');
const unsigned = process.argv.includes('--unsigned');

const prefix = config.mqttTopicPrefix;
const client = mqtt.connect(config.mqttUrl ?? 'mqtt://localhost:1883', {
  username: config.mqttUsername,
  password: config.mqttPassword,
});

let lastTs = 0;
function nextTs(): number {
  lastTs = Math.max(Date.now(), lastTs + 1);
  return lastTs;
}

function body(card: string | null, tag: string | null) {
  const ts = nextTs();
  if (unsigned) return { studentNumber: card, tagUid: tag };
  return { studentNumber: card, tagUid: tag, ts, sig: signPayload(gateId, ts, card, tag) };
}

client.on('connect', () => {
  client.subscribe(`${prefix}/${gateId}/decision`);

  if (heartbeat) {
    console.log('Sending a heartbeat every 5s. Ctrl+C to stop (the gate flips to manual shortly after).');
    const send = () => client.publish(`${prefix}/${gateId}/heartbeat`, JSON.stringify(body(null, null)));
    send();
    setInterval(send, 5000);
    return;
  }

  client.publish(`${prefix}/${gateId}/scan`, JSON.stringify(body(studentNumber, tagUid)));
  setTimeout(() => {
    console.log('No decision received within 4s (check the API log for a rejected or malformed message).');
    client.end(false, {}, () => process.exit(1));
  }, 4000);
});

client.on('message', (_topic, payload) => {
  console.log(`Gate decision: ${payload.toString()}`);
  client.end(false, {}, () => process.exit(0));
});

client.on('error', (err) => {
  console.error(err);
  process.exit(1);
});