import { AppError } from '../middleware/errors.js';
import { findById, findMany } from '../repositories/supabase.repository.js';
import { isActive, unique } from '../utils/database.js';

async function requireActiveClient(clientId) {
  const client = await findById('lc_cliente', 'id_cliente', clientId);
  if (!isActive(client)) throw new AppError(404, 'Cliente activo no encontrado', 'CLIENT_NOT_FOUND');
  return client;
}

async function activeRowsByIds(table, idColumn, ids) {
  const values = unique(ids);
  if (!values.length) return [];
  const rows = await findMany(table, { inFilters: { [idColumn]: values } });
  return rows.filter(isActive);
}

export async function getClientProducts(clientId, typeCode = null) {
  await requireActiveClient(clientId);
  const links = (await findMany('lc_producto_cliente', { filters: { id_cliente: clientId } })).filter(isActive);
  const products = await activeRowsByIds('lc_producto', 'id_producto', links.map((item) => item.id_producto));
  const types = await activeRowsByIds('lc_tipo_producto', 'id_tipo_producto', products.map((item) => item.id_tipo_producto));
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));

  return links.flatMap((link) => {
    const product = productsById.get(link.id_producto);
    const type = product ? typesById.get(product.id_tipo_producto) : null;
    if (!product || !type || (typeCode && type.codigo !== typeCode)) return [];
    return [{
      id_producto: product.id_producto,
      codigo: product.codigo,
      nombre: product.nombre,
      descripcion: product.descripcion,
      imagen_url: product.imagen_url,
      tipo_producto: {
        id_tipo_producto: type.id_tipo_producto,
        codigo: type.codigo,
        nombre: type.nombre
      },
      precio_venta: link.precio_venta
    }];
  });
}

export async function getClientKits(clientId) {
  await requireActiveClient(clientId);
  const kitLinks = (await findMany('lc_kit_cliente', { filters: { id_cliente: clientId } })).filter(isActive);
  const kits = await activeRowsByIds('lc_kit', 'id_kit', kitLinks.map((item) => item.id_kit));
  const kitsById = new Map(kits.map((item) => [item.id_kit, item]));
  const kitIds = [...kitsById.keys()];
  const componentLinks = kitIds.length
    ? (await findMany('lc_kit_producto', { inFilters: { id_kit: kitIds } })).filter(isActive)
    : [];
  const products = await activeRowsByIds('lc_producto', 'id_producto', componentLinks.map((item) => item.id_producto));
  const types = await activeRowsByIds('lc_tipo_producto', 'id_tipo_producto', products.map((item) => item.id_tipo_producto));
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));

  return kitLinks.flatMap((link) => {
    const kit = kitsById.get(link.id_kit);
    if (!kit) return [];
    const components = componentLinks
      .filter((item) => item.id_kit === kit.id_kit)
      .flatMap((item) => {
        const product = productsById.get(item.id_producto);
        const type = product ? typesById.get(product.id_tipo_producto) : null;
        if (!product || !type) return [];
        return [{
          id_producto: product.id_producto,
          codigo: product.codigo,
          nombre: product.nombre,
          tipo: type.codigo,
          cantidad: item.cantidad,
          orden: item.orden
        }];
      })
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return [{
      id_kit: kit.id_kit,
      codigo: kit.codigo,
      nombre: kit.nombre,
      descripcion: kit.descripcion,
      imagen_url: kit.imagen_url,
      precio_venta: link.precio_venta,
      productos: components
    }];
  });
}

export async function getClientKit(clientId, kitId) {
  const kits = await getClientKits(clientId);
  return kits.find((kit) => kit.id_kit === kitId) || null;
}

export async function getCorporateCatalog(context) {
  if (context.role.codigo !== 'CLIENTE' || !context.client) {
    throw new AppError(403, 'Este catalogo requiere un cliente autenticado', 'CLIENT_CONTEXT_REQUIRED');
  }
  const [products, kits] = await Promise.all([
    getClientProducts(context.client.id),
    getClientKits(context.client.id)
  ]);
  return {
    cliente: context.client,
    productos: products.map((product) => ({
      ...product,
      id: product.id_producto,
      tipo: product.tipo_producto
    })),
    kits: kits.map((kit) => ({
      ...kit,
      id: kit.id_kit,
      productos: kit.productos.map((product) => ({ ...product, id: product.id_producto }))
    }))
  };
}
