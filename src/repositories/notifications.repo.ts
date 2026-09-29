import { query, queryOne } from '../db';
import type { Notification, NotificationKind } from '../types';

interface NotificationRow {
  notification_id: string;
  user_id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  created_at: string;
  read: boolean;
}

function toNotification(row: NotificationRow): Notification {
  return {
    notificationId: row.notification_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    createdAt: new Date(row.created_at).toISOString(),
    read: row.read,
  };
}

export const notificationsRepo = {
  async listForUser(userId: string): Promise<Notification[]> {
    const rows = await query<NotificationRow>(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return rows.map(toNotification);
  },

  async create(input: { userId: string; title: string; body: string; kind: NotificationKind }): Promise<Notification> {
    const row = await queryOne<NotificationRow>(
      `INSERT INTO notifications (user_id, title, body, kind) VALUES ($1,$2,$3,$4) RETURNING *`,
      [input.userId, input.title, input.body, input.kind],
    );
    return toNotification(row!);
  },

  async markRead(notificationId: string): Promise<Notification | null> {
    const row = await queryOne<NotificationRow>(
      'UPDATE notifications SET read = TRUE WHERE notification_id = $1 RETURNING *',
      [notificationId],
    );
    return row ? toNotification(row) : null;
  },

  async findById(notificationId: string): Promise<Notification | null> {
    const row = await queryOne<NotificationRow>('SELECT * FROM notifications WHERE notification_id = $1', [
      notificationId,
    ]);
    return row ? toNotification(row) : null;
  },
};
