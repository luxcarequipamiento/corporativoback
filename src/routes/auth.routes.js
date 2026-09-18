import { Router } from 'express';
import { createSessionClient } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { resolveAccessContext } from '../services/access-context.service.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response, next) => {
  try {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    if (!email || !password) throw new AppError(400, 'Correo y contrasena son obligatorios', 'INVALID_CREDENTIALS');

    const sessionClient = createSessionClient();
    const { data, error } = await sessionClient.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      throw new AppError(401, 'Correo o contrasena incorrectos', 'INVALID_CREDENTIALS');
    }

    const context = await resolveAccessContext(data.user);
    response.json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      },
      usuario: context.authUser,
      rol: context.role.codigo,
      cliente: context.client
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const refreshToken = String(request.body?.refresh_token || '');
    if (!refreshToken) throw new AppError(400, 'Refresh token requerido', 'REFRESH_TOKEN_REQUIRED');
    const sessionClient = createSessionClient();
    const { data, error } = await sessionClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new AppError(401, 'Sesion no renovable', 'INVALID_REFRESH_TOKEN');
    response.json({ ok: true, session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }});
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const context = await resolveAccessContext(request.authUser);
    response.json({
      ok: true,
      usuario: {
        id_usuario: context.user.id,
        username: context.user.username,
        nombre: context.user.nombre,
        correo: context.user.correo
      },
      aplicacion: context.application.codigo,
      rol: context.role.codigo,
      cliente: context.client
    });
  } catch (error) {
    next(error);
  }
});
