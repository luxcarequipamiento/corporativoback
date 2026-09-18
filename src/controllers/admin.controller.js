import {
  getClient, getKit, getProduct, getSimpleEntity, getUser,
  listClients, listKits, listProducts, listSimpleEntity, listUsers
} from '../services/admin-query.service.js';
import { parsePositiveId, sendResource } from '../utils/request.js';

export function listSimple(entity) {
  return async (request, response, next) => {
    void request;
    try { response.json({ ok: true, data: await listSimpleEntity(entity) }); } catch (error) { next(error); }
  };
}

export function getSimple(entity) {
  return async (request, response, next) => {
    try { sendResource(response, await getSimpleEntity(entity, parsePositiveId(request.params.id))); } catch (error) { next(error); }
  };
}

function handlers(listService, getService, idName) {
  return {
    list: async (request, response, next) => {
      void request;
      try { response.json({ ok: true, data: await listService() }); } catch (error) { next(error); }
    },
    get: async (request, response, next) => {
      try { sendResource(response, await getService(parsePositiveId(request.params.id, idName))); } catch (error) { next(error); }
    }
  };
}

export const clientAdminController = handlers(listClients, getClient, 'id_cliente');
export const userAdminController = handlers(listUsers, getUser, 'id_usuario');
export const productAdminController = handlers(listProducts, getProduct, 'id_producto');
export const kitAdminController = handlers(listKits, getKit, 'id_kit');
