import { Router } from 'express';
import {
  getCorporateAccessories, getCorporateKit, getCorporateKits, getCorporateMe,
  getCorporateProducts, getCorporateServices
} from '../controllers/corporate.controller.js';
import { loadAccessContext, requireRole } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

export const corporateRouter = Router();
corporateRouter.use(requireAuth, loadAccessContext, requireRole('CLIENTE'));

corporateRouter.get('/me', getCorporateMe);
corporateRouter.get('/productos', getCorporateProducts);
corporateRouter.get('/accesorios', getCorporateAccessories);
corporateRouter.get('/servicios', getCorporateServices);
corporateRouter.get('/kits', getCorporateKits);
corporateRouter.get('/kits/:id', getCorporateKit);
