import 'dotenv/config';

const requiredVariables = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

export function validateEnvironment() {
  const missing = requiredVariables.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrls: (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};
