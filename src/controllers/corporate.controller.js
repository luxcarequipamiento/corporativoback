import { getClientKit, getClientKits, getClientProducts, getClientServicePackages } from '../services/catalog.service.js';
import { parsePositiveId, sendResource } from '../utils/request.js';

export function getCorporateMe(request, response) {
  const context = request.accessContext;
  response.json({
    ok: true,
    data: {
      id_usuario: context.user.id,
      username: context.user.username,
      nombre: context.user.nombre,
      correo: context.user.correo,
      cliente: context.client,
      aplicacion: context.application.codigo,
      rol: context.role.codigo
    }
  });
}

function corporateCollection(loader) {
  return async (request, response, next) => {
    try { response.json({ ok: true, data: await loader(request.accessContext.client.id) }); } catch (error) { next(error); }
  };
}

export const getCorporateProducts = corporateCollection((id) => getClientProducts(id));
export async function getCorporateAccessories(request, response, next) {
  try {
    const unassigned = request.query.modelo === 'unassigned';
    const modelId = request.query.modelo === undefined || unassigned ? null : parsePositiveId(request.query.modelo, 'modelo');
    const products = await getClientProducts(request.accessContext.client.id, 'ACC', modelId);
    response.json({ ok: true, data: unassigned ? products.filter(product => !product.modelo) : products });
  } catch (error) { next(error); }
}

export async function getCorporateAccessoryModels(request, response, next) {
  try {
    const products = await getClientProducts(request.accessContext.client.id, 'ACC');
    const models = new Map();
    for (const product of products) {
      const id = String(product.modelo?.id_modelo || 'unassigned');
      if (!models.has(id)) models.set(id, { id, name: product.modelo?.nombre_modelo || 'Sin modelo asignado', count: 0 });
      models.get(id).count += 1;
    }
    response.json({ ok: true, data: [...models.values()] });
  } catch (error) { next(error); }
}
export const getCorporateServices = corporateCollection((id) => getClientProducts(id, 'SER'));
export const getCorporateKits = corporateCollection((id) => getClientKits(id));
export const getCorporateServicePackages = corporateCollection((id) => getClientServicePackages(id));

export async function getCorporateKit(request, response, next) {
  try {
    const kit = await getClientKit(request.accessContext.client.id, parsePositiveId(request.params.id, 'id_kit'));
    sendResource(response, kit, 'Kit no disponible para el cliente autenticado');
  } catch (error) { next(error); }
}
