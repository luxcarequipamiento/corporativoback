import { getClientKit, getClientKits, getClientProducts } from '../services/catalog.service.js';
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
export const getCorporateAccessories = corporateCollection((id) => getClientProducts(id, 'ACC'));
export const getCorporateServices = corporateCollection((id) => getClientProducts(id, 'SER'));
export const getCorporateKits = corporateCollection((id) => getClientKits(id));

export async function getCorporateKit(request, response, next) {
  try {
    const kit = await getClientKit(request.accessContext.client.id, parsePositiveId(request.params.id, 'id_kit'));
    sendResource(response, kit, 'Kit no disponible para el cliente autenticado');
  } catch (error) { next(error); }
}
