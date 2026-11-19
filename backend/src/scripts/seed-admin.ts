import 'dotenv/config';
import argon2 from 'argon2';
import { closeDatabasePool, dbPool } from '../shared/infrastructure/database/pool.js';

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME?.trim() || 'Administrador Principal';

  // Producción exige 10+ caracteres; en desarrollo se permite una clave corta (mínimo 6, igual que el login)
  const minLength = process.env.NODE_ENV === 'production' ? 10 : 6;

  if (!email || !password || password.length < minLength) {
    throw new Error(
      `Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo ${minLength} caracteres) en el entorno para ejecutar este script`,
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await dbPool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'admin', 1)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       password_hash = VALUES(password_hash),
       role = 'admin',
       is_active = 1,
       deleted_at = NULL`,
    [fullName, email, passwordHash],
  );

  console.log(`Usuario admin listo: ${email}`);
  await closeDatabasePool();
}

seedAdmin().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeDatabasePool();
  process.exit(1);
});
