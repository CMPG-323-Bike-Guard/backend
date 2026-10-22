interface PendingTap {
  cardHmac: string;
  cardRef: string;
  at: number;
}

const MAX_AGE_MS = 60_000;
let pending: PendingTap | null = null;

export function rememberTap(cardHmac: string, cardRef: string): void {
  pending = { cardHmac, cardRef, at: Date.now() };
}

export function latestTap(): PendingTap | null {
  return pending && Date.now() - pending.at <= MAX_AGE_MS ? pending : null;
}