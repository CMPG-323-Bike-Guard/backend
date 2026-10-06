import { pool } from '../src/db';
import { gateKey } from '../src/gate-auth';
import { gatesRepo } from '../src/repositories/gates.repo';

async function main() {
  const gates = await gatesRepo.list();
  for (const gate of gates) {
    console.log(`${gate.name}\n  gateId: ${gate.gateId}\n  key:    ${gateKey(gate.gateId)}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});