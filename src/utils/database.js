import { AppError } from '../middleware/errors.js';

export function assertDatabaseResult(error, message = 'No fue posible consultar la base de datos') {
  if (error) {
    console.error('Supabase query error:', error.code, error.message);
    throw new AppError(500, message, 'DATABASE_ERROR');
  }
}

export function isActive(record) {
  return record && record.activo !== false;
}

export function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}
