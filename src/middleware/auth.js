import { supabase } from '../config/supabase.js';
import { AppError } from './errors.js';

export async function requireAuth(request, response, next) {
  void response;
  try {
    const authorization = request.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Token de acceso requerido', 'AUTH_REQUIRED');
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, 'Token invalido o vencido', 'INVALID_TOKEN');
    }

    request.accessToken = token;
    request.authUser = data.user;
    next();
  } catch (error) {
    next(error);
  }
}
