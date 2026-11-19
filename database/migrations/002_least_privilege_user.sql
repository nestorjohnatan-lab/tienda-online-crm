-- =============================================================================
-- Migración 002: Usuario de Aplicación con Mínimo Privilegio (PoLP)
-- Ejecutar con un usuario administrador de MariaDB SOLO durante provisión inicial.
--
-- IMPORTANTE (Twelve-Factor / Secret Scanning):
--   Reemplazar 'CAMBIAR_POR_PASSWORD_FUERTE_EN_ENV' antes de ejecutar en local
--   y almacenar la contraseña únicamente en backend/.env (nunca en Git).
-- =============================================================================

CREATE USER IF NOT EXISTS 'tienda_crm_app'@'localhost'
  IDENTIFIED BY 'CAMBIAR_POR_PASSWORD_FUERTE_EN_ENV';

CREATE USER IF NOT EXISTS 'tienda_crm_app'@'127.0.0.1'
  IDENTIFIED BY 'CAMBIAR_POR_PASSWORD_FUERTE_EN_ENV';

-- Permisos estrictos: solo lectura, inserción y actualización sobre tienda_crm.
-- Prohibido DROP, ALTER, CREATE, DELETE físico y acceso a otros esquemas.
GRANT SELECT, INSERT, UPDATE ON tienda_crm.* TO 'tienda_crm_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON tienda_crm.* TO 'tienda_crm_app'@'127.0.0.1';

FLUSH PRIVILEGES;
