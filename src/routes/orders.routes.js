import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadAccessContext, requireRole } from '../middleware/access.js';
import { saveOrder } from '../services/orders.service.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth, loadAccessContext, requireRole('CLIENTE'));
ordersRouter.post('/', async (request, response, next) => {
  try { response.json({ ok: true, data: await saveOrder(request.accessContext, request.body) }); }
  catch (error) { next(error); }
});
