export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(request, response) {
  response.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${request.method} ${request.originalUrl}`
  });
}

export function errorHandler(error, request, response, next) {
  void request;
  void next;
  console.error(error);
  response.status(error.status || 500).json({
    ok: false,
    code: error.code || 'INTERNAL_ERROR',
    message: error.status ? error.message : 'Error interno del servidor'
  });
}
