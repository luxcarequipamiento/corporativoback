import { Router } from 'express';
import { supabase } from '../config/supabase.js';

export const healthRouter = Router();

healthRouter.get('/', (request, response) => {
  void request;
  response.json({ ok: true, service: 'luxcar-api' });
});

healthRouter.get('/database', async (request, response, next) => {
  void request;
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    response.json({ ok: true, database: 'connected' });
  } catch (error) {
    next(error);
  }
});
