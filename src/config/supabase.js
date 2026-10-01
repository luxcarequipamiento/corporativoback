import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Este cliente solo debe ejecutarse en el backend: usa permisos administrativos.
export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cada operación de sesión usa una instancia aislada para no reemplazar
// la autorización administrativa del cliente usado en consultas internas.
export function createSessionClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
