import { Router } from 'express';
import {
  getClientAccessoriesController, getClientKitController, getClientKitsController,
  getClientProductsController, getClientProfile, getClientServicesController
} from '../controllers/client.controller.js';
import { clientAdminController } from '../controllers/admin.controller.js';
import { loadAccessContext, requireRequestedClient, requireRole } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

export const clientsRouter = Router();
clientsRouter.use(requireAuth, loadAccessContext);

clientsRouter.get('/slug/:slug', requireRequestedClient, getClientProfile);
clientsRouter.get('/slug/:slug/productos', requireRequestedClient, getClientProductsController);
clientsRouter.get('/slug/:slug/accesorios', requireRequestedClient, getClientAccessoriesController);
clientsRouter.get('/slug/:slug/servicios', requireRequestedClient, getClientServicesController);
clientsRouter.get('/slug/:slug/kits', requireRequestedClient, getClientKitsController);
clientsRouter.get('/slug/:slug/kits/:idKit', requireRequestedClient, getClientKitController);

clientsRouter.get('/:idCliente/productos', requireRequestedClient, getClientProductsController);
clientsRouter.get('/:idCliente/accesorios', requireRequestedClient, getClientAccessoriesController);
clientsRouter.get('/:idCliente/servicios', requireRequestedClient, getClientServicesController);
clientsRouter.get('/:idCliente/kits', requireRequestedClient, getClientKitsController);
clientsRouter.get('/:idCliente/kits/:idKit', requireRequestedClient, getClientKitController);

clientsRouter.get('/', requireRole('ADMIN'), clientAdminController.list);
clientsRouter.get('/:id', requireRole('ADMIN'), clientAdminController.get);
