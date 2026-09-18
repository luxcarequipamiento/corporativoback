import { getClient, getClientBySlug } from '../services/admin-query.service.js';
import { getClientKit, getClientKits, getClientProducts } from '../services/catalog.service.js';
import { AppError } from '../middleware/errors.js';
import { parsePositiveId, sendResource } from '../utils/request.js';

async function resolveClient(request) {
  if (request.params.idCliente) {
    const id = parsePositiveId(request.params.idCliente, 'id_cliente');
    const client = await getClient(id);
    if (!client) throw new AppError(404, 'Cliente no encontrado', 'CLIENT_NOT_FOUND');
    return client;
  }
  const slug = String(request.params.slug || '').trim().toLowerCase();
  if (!slug) throw new AppError(400, 'Slug requerido', 'INVALID_PARAMETER');
  const client = await getClientBySlug(slug);
  if (!client) throw new AppError(404, 'Cliente no encontrado', 'CLIENT_NOT_FOUND');
  return client;
}

export async function getClientProfile(request, response, next) {
  try { sendResource(response, await resolveClient(request), 'Cliente no encontrado'); } catch (error) { next(error); }
}

function clientCollection(loader) {
  return async (request, response, next) => {
    try {
      const client = await resolveClient(request);
      response.json({ ok: true, cliente: client, data: await loader(client.id_cliente) });
    } catch (error) { next(error); }
  };
}

export const getClientProductsController = clientCollection((id) => getClientProducts(id));
export const getClientAccessoriesController = clientCollection((id) => getClientProducts(id, 'ACC'));
export const getClientServicesController = clientCollection((id) => getClientProducts(id, 'SER'));
export const getClientKitsController = clientCollection((id) => getClientKits(id));

export async function getClientKitController(request, response, next) {
  try {
    const client = await resolveClient(request);
    const kit = await getClientKit(client.id_cliente, parsePositiveId(request.params.idKit, 'id_kit'));
    sendResource(response, kit, 'Kit no disponible para este cliente');
  } catch (error) { next(error); }
}
