import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.routes.js';
import { simpleAdminRouter, kitsRouter, productsRouter, usersRouter } from './routes/admin.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { clientsRouter } from './routes/clients.routes.js';
import { corporateRouter } from './routes/corporate.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { slugCatalogRouter } from './routes/slug-catalog.routes.js';

export const app = express();

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://corporativofront.vercel.app',
  'https://corporativofront-l1n3ytuyf-luxcar3.vercel.app',
  env.frontendUrl,
  ...env.frontendUrls
]);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/catalogo', catalogRouter);
app.use('/api/tipos-cliente', simpleAdminRouter('tiposCliente'));
app.use('/api/clientes', clientsRouter);
app.use('/api/usuarios', usersRouter);
app.use('/api/usuarios-clientes', simpleAdminRouter('usuariosClientes'));
app.use('/api/usuarios-aplicaciones', simpleAdminRouter('usuariosAplicaciones'));
app.use('/api/aplicaciones', simpleAdminRouter('aplicaciones'));
app.use('/api/roles', simpleAdminRouter('roles'));
app.use('/api/tipos-producto', simpleAdminRouter('tiposProducto'));
app.use('/api/productos', productsRouter);
app.use('/api/productos-clientes', simpleAdminRouter('productosClientes'));
app.use('/api/kits', kitsRouter);
app.use('/api/kits-productos', simpleAdminRouter('kitsProductos'));
app.use('/api/kits-clientes', simpleAdminRouter('kitsClientes'));
app.use('/api/corporativo', corporateRouter);

// Debe permanecer despues de las rutas estaticas para no capturar /auth, /kits, etc.
app.use('/api/:slug', slugCatalogRouter);

app.use(notFoundHandler);
app.use(errorHandler);
