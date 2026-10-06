import { pool, query } from '../src/db';
import { displayRef, hashPassword, hmacIdentifier } from '../src/security';



async function seed() {
   if (process.argv.includes('--reset')) {
    console.log('Clearing existing data...');
    await query('TRUNCATE users, gates, bikes CASCADE');
  }

  const existing = await query('SELECT 1 FROM users WHERE student_number = $1', ['90003344']);
  if (existing.length > 0) {
    console.log('Dev data is already seeded. Run "npm run seed:reset" to wipe and reseed.');
    await pool.end();
    return;
  }
  console.log('Seeding BikeGuard dev data...');

  const passwordHash = await hashPassword('Password123!');

  async function makeUser(studentNumber: string, name: string, email: string, role: 'student' | 'guard' | 'admin') {
    const [row] = await query<{ user_id: string }>(
      `INSERT INTO users (student_number, name, email, role, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
      [studentNumber, name, email, role, passwordHash],
    );
    return row.user_id;
  }

  async function makeCard(userId: string, rawUid: string) {
    const hmac = hmacIdentifier(rawUid);
    await query(`INSERT INTO cards (user_id, card_hmac, card_ref) VALUES ($1,$2,$3)`, [
      userId,
      hmac,
      displayRef('CRD', hmac),
    ]);
  }

  const thabo = await makeUser('30112233', 'Thabo Mokoena', 'thabo.mokoena@student.nwu.ac.za', 'student');
  const lerato = await makeUser('30112244', 'Lerato Dube', 'lerato.dube@student.nwu.ac.za', 'student');
  const guard = await makeUser('90001122', 'Sipho Nkosi', 'sipho.nkosi@nwu.ac.za', 'guard');
  const admin = await makeUser('90003344', 'Anja van der Merwe', 'anja.vandermerwe@nwu.ac.za', 'admin');

  await Promise.all([makeCard(thabo, 'CARD-RAW-0001'), makeCard(lerato, 'CARD-RAW-0002')]);

  const [gate1] = await query<{ gate_id: string }>(
    `INSERT INTO gates (name, location, health, commissioned, mode) VALUES ($1,$2,'good',true,'automated') RETURNING gate_id`,
    ['Gate 1 — Building G16', 'Building G16, east entrance'],
  );
  await query(`INSERT INTO gates (name, location, health, commissioned, mode) VALUES ($1,$2,'good',true,'automated')`, [
    'Gate 2 — Res Village',
    'Res Village main boom',
  ]);

  const [bikeActive] = await query<{ bike_id: string }>(
    `INSERT INTO bikes (owner_user_id, name, make_model, colour, status, reviewed_at)
     VALUES ($1,'Thabo''s commuter','Silverback Scoop','Matte black','active', now()) RETURNING bike_id`,
    [thabo],
  );
  const activeTagHmac = hmacIdentifier('TAG-RAW-0001');
  await query(`INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status) VALUES ($1,$2,$3,'active')`, [
    bikeActive.bike_id,
    activeTagHmac,
    displayRef('BG', activeTagHmac),
  ]);

  await query(
    `INSERT INTO bikes (owner_user_id, name, make_model, colour, status) VALUES ($1,'Lerato''s campus bike','Titan Track','Teal','pending_approval')`,
    [lerato],
  );

  console.log('Seed complete. Sample logins (password: Password123!):');
  console.log('  student: 30112233 (Thabo Mokoena)');
  console.log('  student: 30112244 (Lerato Dube)');
  console.log('  guard:   90001122 (Sipho Nkosi)');
  console.log('  admin:   90003344 (Anja van der Merwe)');
  void gate1;
  void admin;
  void guard;

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
