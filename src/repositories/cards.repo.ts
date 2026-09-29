import { query, queryOne } from '../db';
import type { Card } from '../types';

interface CardRow {
  card_id: string;
  user_id: string;
  card_ref: string;
  status: 'active' | 'blocked';
}

function toCard(row: CardRow): Card {
  return { cardId: row.card_id, userId: row.user_id, cardRef: row.card_ref, status: row.status };
}

export const cardsRepo = {
  async findByUserId(userId: string): Promise<Card | null> {
    const row = await queryOne<CardRow>(
      "SELECT card_id, user_id, card_ref, status FROM cards WHERE user_id = $1 AND status = 'active'",
      [userId],
    );
    return row ? toCard(row) : null;
  },

  async findByHmac(cardHmac: string): Promise<(Card & { userId: string }) | null> {
    const row = await queryOne<CardRow>('SELECT card_id, user_id, card_ref, status FROM cards WHERE card_hmac = $1', [
      cardHmac,
    ]);
    return row ? toCard(row) : null;
  },

  async create(input: { userId: string; cardHmac: string; cardRef: string }): Promise<Card> {
    const row = await queryOne<CardRow>(
      `INSERT INTO cards (user_id, card_hmac, card_ref) VALUES ($1, $2, $3)
       RETURNING card_id, user_id, card_ref, status`,
      [input.userId, input.cardHmac, input.cardRef],
    );
    return toCard(row!);
  },

  async all(): Promise<Card[]> {
    const rows = await query<CardRow>('SELECT card_id, user_id, card_ref, status FROM cards');
    return rows.map(toCard);
  },
};
