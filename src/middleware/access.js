import { AppError } from './errors.js';
import { resolveAccessContext } from '../services/access-context.service.js';

export async function loadAccessContext(request, response, next) {
  void response;
  try {
    request.accessContext = await resolveAccessContext(request.authUser);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    void response;
    if (!request.accessContext || !allowedRoles.includes(request.accessContext.role.codigo)) {
      return next(new AppError(403, 'No tienes permisos para consultar este recurso', 'ROLE_ACCESS_DENIED'));
    }
    next();
  };
}

export function requireRequestedClient(request, response, next) {
  void response;
  const context = request.accessContext;
  if (context.role.codigo === 'ADMIN') return next();
  const requestedId = request.params.idCliente ? Number(request.params.idCliente) : null;
  const requestedSlug = request.params.slug?.toLowerCase();
  const matchesId = requestedId !== null && requestedId === Number(context.client?.id);
  const matchesSlug = requestedSlug && requestedSlug === context.client?.slug;
  if (!matchesId && !matchesSlug) {
    return next(new AppError(403, 'No tienes acceso a la informacion de este cliente', 'CLIENT_ACCESS_DENIED'));
  }
  next();
}
