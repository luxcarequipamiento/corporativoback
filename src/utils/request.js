import { AppError } from '../middleware/errors.js';

export function parsePositiveId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${name} debe ser un entero positivo`, 'INVALID_PARAMETER');
  return id;
}

export function sendResource(response, data, message = 'Recurso no encontrado') {
  if (!data) throw new AppError(404, message, 'RESOURCE_NOT_FOUND');
  response.json({ ok: true, data });
}
