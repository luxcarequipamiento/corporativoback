import { Router } from 'express';
import {
  getCorporateAccessories, getCorporateKits, getCorporateServices
} from '../controllers/corporate.controller.js';
import { loadAccessContext, requireRequestedClient, requireRole } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

export const slugCatalogRouter = Router({ mergeParams: true });

slugCatalogRouter.use(
  requireAuth,
  loadAccessContext,
  requireRole('CLIENTE'),
  requireRequestedClient
);

slugCatalogRouter.get('/kits', getCorporateKits);
slugCatalogRouter.get('/servicios', getCorporateServices);
slugCatalogRouter.get('/accesorios', getCorporateAccessories);
