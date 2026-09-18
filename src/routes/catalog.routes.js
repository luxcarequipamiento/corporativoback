import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { resolveAccessContext } from '../services/access-context.service.js';
import { getCorporateCatalog } from '../services/catalog.service.js';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get('/', async (request, response, next) => {
  try {
    const context = await resolveAccessContext(request.authUser);
    const catalog = await getCorporateCatalog(context);
    response.json({ ok: true, ...catalog });
  } catch (error) {
    next(error);
  }
});
