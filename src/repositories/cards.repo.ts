import { query, queryOne } from '../db';

export const cardsRepo = {
  async findStudentNumber(cardHmac: string): Promise<string | null> {
    const row = await queryOne<{ student_number: string }>(
      `SELECT student_number FROM cards WHERE card_hmac = $1 AND status = 'active'`,
      [cardHmac],
    );
    return row?.student_number ?? null;
  },

  async link(studentNumber: string, cardHmac: string, cardRef: string): Promise<void> {
    await query(
      `INSERT INTO cards (student_number, card_hmac, card_ref) VALUES ($1, $2, $3)
       ON CONFLICT (card_hmac) DO UPDATE SET student_number = EXCLUDED.student_number, status = 'active'`,
      [studentNumber, cardHmac, cardRef],
    );
    await query(
      `UPDATE cards SET status = 'blocked' WHERE student_number = $1 AND card_hmac <> $2`,
      [studentNumber, cardHmac],
    );
  },
};