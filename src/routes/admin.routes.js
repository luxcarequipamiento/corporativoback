import { Router } from 'express';
import {
  clientAdminController, getSimple, kitAdminController, listSimple,
  productAdminController, userAdminController
} from '../controllers/admin.controller.js';
import { loadAccessContext, requireRole } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

function protectedRouter() {
  const router = Router();
  router.use(requireAuth, loadAccessContext, requireRole('ADMIN'));
  return router;
}

export function simpleAdminRouter(entity) {
  const router = protectedRouter();
  router.get('/', listSimple(entity));
  router.get('/:id', getSimple(entity));
  return router;
}

function resourceRouter(controller) {
  const router = protectedRouter();
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  return router;
}

export const usersRouter = resourceRouter(userAdminController);
export const productsRouter = resourceRouter(productAdminController);
export const kitsRouter = resourceRouter(kitAdminController);
export const adminClientsRouter = resourceRouter(clientAdminController);
