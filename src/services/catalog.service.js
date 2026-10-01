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
  const models = await activeRowsByIds('lc_modelo', 'id_modelo', products.map((item) => item.id_modelo));
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));
  const modelsById = new Map(models.map((item) => [item.id_modelo, item]));

  return links.flatMap((link) => {
    const product = productsById.get(link.id_producto);
    const type = product ? typesById.get(product.id_tipo_producto) : null;
    if (!product || !type || (typeCode && type.codigo !== typeCode)) return [];
    return [{
      id_producto: product.id_producto,
      id_modelo: product.id_modelo,
      codigo: product.codigo,
      nombre: product.nombre,
      descripcion: product.descripcion,
      imagen_url: product.imagen_url,
      tipo_producto: {
        id_tipo_producto: type.id_tipo_producto,
        codigo: type.codigo,
        nombre: type.nombre
      },
      modelo: modelsById.has(product.id_modelo) ? {
        id_modelo: modelsById.get(product.id_modelo).id_modelo,
        codigo_modelo: modelsById.get(product.id_modelo).codigo_modelo,
        nombre_modelo: modelsById.get(product.id_modelo).nombre_modelo
      } : null,
      precio_venta: link.precio_venta
    }];
  });
}

export async function getClientKits(clientId) {
  await requireActiveClient(clientId);
  const [kitLinks, productLinks] = await Promise.all([
    findMany('lc_kit_cliente', { filters: { id_cliente: clientId } }),
    findMany('lc_producto_cliente', { filters: { id_cliente: clientId } })
  ]);
  const activeKitLinks = kitLinks.filter(isActive);
  const productPricesById = new Map(productLinks.filter(isActive).map((item) => [item.id_producto, item.precio_venta]));
  const kits = await activeRowsByIds('lc_kit', 'id_kit', activeKitLinks.map((item) => item.id_kit));
  const kitsById = new Map(kits.map((item) => [item.id_kit, item]));
  const kitIds = [...kitsById.keys()];
  const componentLinks = kitIds.length
    ? (await findMany('lc_kit_producto', { inFilters: { id_kit: kitIds } })).filter(isActive)
    : [];
  const products = await activeRowsByIds('lc_producto', 'id_producto', componentLinks.map((item) => item.id_producto));
  const types = await activeRowsByIds('lc_tipo_producto', 'id_tipo_producto', products.map((item) => item.id_tipo_producto));
  const modelIds = componentLinks.map((item) => item.id_modelo).concat(products.map((item) => item.id_modelo));
  const models = await activeRowsByIds('lc_modelo', 'id_modelo', modelIds);
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));
  const modelsById = new Map(models.map((item) => [item.id_modelo, item]));

  return activeKitLinks.flatMap((link) => {
    const kit = kitsById.get(link.id_kit);
    if (!kit) return [];
    const components = componentLinks
      .filter((item) => item.id_kit === kit.id_kit)
      .flatMap((item) => {
        const product = productsById.get(item.id_producto);
        const type = product ? typesById.get(product.id_tipo_producto) : null;
        const modelId = item.id_modelo ?? product?.id_modelo;
        if (!product || !type) return [];
        return [{
          id_producto: product.id_producto,
          id_modelo: modelId,
          codigo: product.codigo,
          nombre: product.nombre,
          tipo: type.codigo,
          modelo: modelsById.has(modelId) ? {
            id_modelo: modelsById.get(modelId).id_modelo,
            codigo_modelo: modelsById.get(modelId).codigo_modelo,
            nombre_modelo: modelsById.get(modelId).nombre_modelo
          } : null,
          precio_venta: productPricesById.get(product.id_producto) ?? null,
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

export async function getClientServicePackages(clientId) {
  const clientProducts = await getClientProducts(clientId);
  const clientProductsById = new Map(clientProducts.map((item) => [item.id_producto, item]));
  const packages = (await findMany('lc_servicio_paquete')).filter(isActive);
  const packageIds = packages.map((item) => item.id_servicio_paquete);
  const links = packageIds.length
    ? (await findMany('lc_servicio_paquete_producto', { inFilters: { id_servicio_paquete: packageIds } })).filter(isActive)
    : [];
  const products = await activeRowsByIds('lc_producto', 'id_producto', links.map((item) => item.id_producto));
  const types = await activeRowsByIds('lc_tipo_producto', 'id_tipo_producto', products.map((item) => item.id_tipo_producto));
  const modelIds = products.map((item) => item.id_modelo).concat(packages.map((item) => item.id_modelo));
  const models = await activeRowsByIds('lc_modelo', 'id_modelo', modelIds);
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));
  const modelsById = new Map(models.map((item) => [item.id_modelo, item]));

  return packages.flatMap((servicePackage) => {
    const packageProducts = links
      .filter((link) => link.id_servicio_paquete === servicePackage.id_servicio_paquete)
      .flatMap((link) => {
        const product = productsById.get(link.id_producto);
        if (!product) return [];
        const model = modelsById.get(product.id_modelo);
        return [{
          id_producto: product.id_producto,
          id_modelo: product.id_modelo,
          codigo: product.codigo,
          nombre: product.nombre,
          tipo: typesById.get(product.id_tipo_producto)?.codigo || null,
          modelo: model ? {
            id_modelo: model.id_modelo,
            codigo_modelo: model.codigo_modelo,
            nombre_modelo: model.nombre_modelo
          } : null,
          precio_venta: clientProductsById.get(product.id_producto)?.precio_venta ?? null,
          cantidad: link.cantidad,
          orden: link.orden
        }];
      })
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    if (!packageProducts.some((product) => clientProductsById.has(product.id_producto))) return [];
    return [{
    id_servicio_paquete: servicePackage.id_servicio_paquete,
    id_modelo: servicePackage.id_modelo,
    codigo: servicePackage.codigo,
    nombre: servicePackage.nombre,
    descripcion: servicePackage.descripcion,
    precio_venta: servicePackage.precio_venta,
    modelo: modelsById.has(servicePackage.id_modelo) ? {
      id_modelo: modelsById.get(servicePackage.id_modelo).id_modelo,
      codigo_modelo: modelsById.get(servicePackage.id_modelo).codigo_modelo,
      nombre_modelo: modelsById.get(servicePackage.id_modelo).nombre_modelo
    } : null,
      productos: packageProducts
    }];
  });
}

export async function getCorporateCatalog(context) {
  if (context.role.codigo !== 'CLIENTE' || !context.client) {
    throw new AppError(403, 'Este catálogo requiere un cliente autenticado', 'CLIENT_CONTEXT_REQUIRED');
  }
  const [products, kits, servicePackages] = await Promise.all([
    getClientProducts(context.client.id),
    getClientKits(context.client.id),
    getClientServicePackages(context.client.id)
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
    })),
    servicios_paquetes: servicePackages.map((servicePackage) => ({
      ...servicePackage,
      id: servicePackage.id_servicio_paquete,
      productos: servicePackage.productos.map((product) => ({ ...product, id: product.id_producto }))
    }))
  };
}
