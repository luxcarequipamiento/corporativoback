import { Router } from 'express';
import {
  getAdminConversations, getAdminMessages, getClientMessages,
  postAdminMessage, postClientMessage, prepareAdminFile, prepareClientFile
} from '../controllers/messaging.controller.js';
import { loadAccessContext, requireRole } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

export const messagingRouter = Router();
messagingRouter.use(requireAuth, loadAccessContext);

messagingRouter.get('/cliente', requireRole('CLIENTE'), getClientMessages);
messagingRouter.post('/cliente/archivos/preparar', requireRole('CLIENTE'), prepareClientFile);
messagingRouter.post('/cliente/mensajes', requireRole('CLIENTE'), postClientMessage);

messagingRouter.get('/admin/conversaciones', requireRole('ADMIN'), getAdminConversations);
messagingRouter.get('/admin/conversaciones/:id', requireRole('ADMIN'), getAdminMessages);
messagingRouter.post('/admin/conversaciones/:id/archivos/preparar', requireRole('ADMIN'), prepareAdminFile);
messagingRouter.post('/admin/conversaciones/:id/mensajes', requireRole('ADMIN'), postAdminMessage);
