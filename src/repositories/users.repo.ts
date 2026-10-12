import { query, queryOne } from '../db';
import { toPhoto, type PhotoColumns } from '../photos';
import type { AccountStatus, Role, User } from '../types';

interface UserRow extends PhotoColumns {
  user_id: string;
  student_number: string;
  name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  password_hash: string;
  phone: string | null;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

function toUser(row: UserRow): User {
  return {
    userId: row.user_id,
    studentStaffNumber: row.student_number,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    photo: toPhoto(row),
    photoPath: row.photo_path,
    accountStatus: row.account_status,
  };
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return { ...toUser(row), passwordHash: row.password_hash };
}

export const usersRepo = {
  async findById(userId: string): Promise<User | null> {
    const row = await queryOne<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
    return row ? toUser(row) : null;
  },

  async findByIdWithPassword(userId: string): Promise<UserWithPassword | null> {
    const row = await queryOne<UserRow>('SELECT * FROM users WHERE user_id = $1', [userId]);
    return row ? toUserWithPassword(row) : null;
  },

  async findByStudentNumber(studentNumber: string): Promise<User | null> {
    const row = await queryOne<UserRow>('SELECT * FROM users WHERE student_number = $1', [studentNumber.trim()]);
    return row ? toUser(row) : null;
  },

  async findByStudentNumberWithPassword(studentNumber: string): Promise<UserWithPassword | null> {
    const row = await queryOne<UserRow>('SELECT * FROM users WHERE student_number = $1', [studentNumber.trim()]);
    return row ? toUserWithPassword(row) : null;
  },

  async list(role?: 'student' | 'guard' | 'admin'): Promise<User[]> {
    const rows = role
      ? await query<UserRow>('SELECT * FROM users WHERE role = $1 ORDER BY name', [role])
      : await query<UserRow>('SELECT * FROM users ORDER BY name');
    return rows.map(toUser);
  },

  async create(input: {
    studentNumber: string;
    name: string;
    email: string;
    role: Role;
    passwordHash: string;
    photoPath?: string | null;
  }): Promise<User> {
    const row = await queryOne<UserRow>(
      `INSERT INTO users (student_number, name, email, role, password_hash, photo_path)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.studentNumber, input.name, input.email, input.role, input.passwordHash, input.photoPath ?? null],
    );
    return toUser(row!);
  },

  async updateDetails(userId: string, fields: { name: string; email: string; phone: string | null }): Promise<User | null> {
    const row = await queryOne<UserRow>(
      'UPDATE users SET name = $2, email = $3, phone = $4 WHERE user_id = $1 RETURNING *',
      [userId, fields.name, fields.email, fields.phone],
    );
    return row ? toUser(row) : null;
  },

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await query('UPDATE users SET password_hash = $2 WHERE user_id = $1', [userId, passwordHash]);
  },
};
