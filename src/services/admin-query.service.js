import { findById, findMany } from '../repositories/supabase.repository.js';
import { unique } from '../utils/database.js';

const SIMPLE_ENTITIES = {
  tiposCliente: { table: 'lc_tipo_cliente', id: 'id_tipo_cliente', fields: ['id_tipo_cliente', 'codigo', 'nombre', 'descripcion', 'activo'] },
  aplicaciones: { table: 'lc_aplicacion', id: 'id_aplicacion', fields: ['id_aplicacion', 'codigo', 'nombre', 'descripcion', 'activo'] },
  roles: { table: 'lc_rol', id: 'id_rol', fields: ['id_rol', 'codigo', 'nombre', 'descripcion', 'activo'] },
  tiposProducto: { table: 'lc_tipo_producto', id: 'id_tipo_producto', fields: ['id_tipo_producto', 'codigo', 'nombre', 'descripcion', 'activo'] },
  usuariosClientes: { table: 'lc_usuario_cliente', id: 'id_usuario_cliente', fields: ['id_usuario_cliente', 'id_usuario', 'id_cliente', 'activo'] },
  usuariosAplicaciones: { table: 'lc_usuario_aplicacion', id: 'id_usuario_aplicacion', fields: ['id_usuario_aplicacion', 'id_usuario', 'id_aplicacion', 'id_rol', 'activo'] },
  productosClientes: { table: 'lc_producto_cliente', id: 'id_producto_cliente', fields: ['id_producto_cliente', 'id_producto', 'id_cliente', 'precio_venta', 'activo'] },
  kitsProductos: { table: 'lc_kit_producto', id: 'id_kit_producto', fields: ['id_kit_producto', 'id_kit', 'id_producto', 'cantidad', 'orden', 'activo'] },
  kitsClientes: { table: 'lc_kit_cliente', id: 'id_kit_cliente', fields: ['id_kit_cliente', 'id_kit', 'id_cliente', 'precio_venta', 'activo'] }
};

function pick(record, fields) {
  if (!record) return null;
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
}

async function rowsByIds(table, idColumn, ids) {
  const values = unique(ids);
  return values.length ? findMany(table, { inFilters: { [idColumn]: values } }) : [];
}

export async function listSimpleEntity(entity) {
  const config = SIMPLE_ENTITIES[entity];
  const rows = await findMany(config.table, { orderBy: { column: config.id } });
  return rows.map((row) => pick(row, config.fields));
}

export async function getSimpleEntity(entity, id) {
  const config = SIMPLE_ENTITIES[entity];
  return pick(await findById(config.table, config.id, id), config.fields);
}

export async function listClients() {
  const [clients, types] = await Promise.all([
    findMany('lc_cliente', { orderBy: { column: 'id_cliente' } }),
    findMany('lc_tipo_cliente')
  ]);
  const typesById = new Map(types.map((type) => [type.id_tipo_cliente, pick(type, ['id_tipo_cliente', 'codigo', 'nombre'])]));
  return clients.map((client) => ({
    ...pick(client, ['id_cliente', 'codigo', 'nombre', 'nombre_comercial', 'slug', 'logo_url', 'color_primario', 'color_secundario', 'activo']),
    tipo_cliente: typesById.get(client.id_tipo_cliente) || null
  }));
}

export async function getClient(id) {
  const client = await findById('lc_cliente', 'id_cliente', id);
  if (!client) return null;
  const type = await findById('lc_tipo_cliente', 'id_tipo_cliente', client.id_tipo_cliente);
  return {
    ...pick(client, ['id_cliente', 'codigo', 'nombre', 'nombre_comercial', 'slug', 'logo_url', 'color_primario', 'color_secundario', 'activo']),
    tipo_cliente: pick(type, ['id_tipo_cliente', 'codigo', 'nombre'])
  };
}

export async function getClientBySlug(slug) {
  const rows = await findMany('lc_cliente', { filters: { slug } });
  return rows[0] ? getClient(rows[0].id_cliente) : null;
}

export async function listUsers() {
  const [users, userClients, userApps, clients, applications, roles] = await Promise.all([
    findMany('lc_usuario', { orderBy: { column: 'id_usuario' } }),
    findMany('lc_usuario_cliente'),
    findMany('lc_usuario_aplicacion'),
    findMany('lc_cliente'),
    findMany('lc_aplicacion'),
    findMany('lc_rol')
  ]);
  const clientsById = new Map(clients.map((item) => [item.id_cliente, item]));
  const appsById = new Map(applications.map((item) => [item.id_aplicacion, item]));
  const rolesById = new Map(roles.map((item) => [item.id_rol, item]));
  return users.map((user) => ({
    ...pick(user, ['id_usuario', 'id_auth', 'username', 'nombre', 'apellido', 'correo', 'activo']),
    clientes: userClients.filter((link) => link.id_usuario === user.id_usuario).map((link) => {
      const client = clientsById.get(link.id_cliente);
      return { ...pick(client, ['id_cliente', 'codigo', 'nombre', 'slug']), activo: link.activo };
    }),
    aplicaciones: userApps.filter((access) => access.id_usuario === user.id_usuario).map((access) => ({
      aplicacion: pick(appsById.get(access.id_aplicacion), ['id_aplicacion', 'codigo', 'nombre']),
      rol: pick(rolesById.get(access.id_rol), ['id_rol', 'codigo', 'nombre']),
      activo: access.activo
    }))
  }));
}

export async function getUser(id) {
  const users = await listUsers();
  return users.find((user) => user.id_usuario === id) || null;
}

export async function listProducts() {
  const [products, types, links, clients] = await Promise.all([
    findMany('lc_producto', { orderBy: { column: 'id_producto' } }),
    findMany('lc_tipo_producto'),
    findMany('lc_producto_cliente'),
    findMany('lc_cliente')
  ]);
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));
  const clientsById = new Map(clients.map((item) => [item.id_cliente, item]));
  return products.map((product) => ({
    ...pick(product, ['id_producto', 'codigo', 'nombre', 'descripcion', 'precio_real', 'imagen_url', 'activo']),
    tipo_producto: pick(typesById.get(product.id_tipo_producto), ['id_tipo_producto', 'codigo', 'nombre']),
    clientes: links.filter((link) => link.id_producto === product.id_producto).map((link) => ({
      cliente: pick(clientsById.get(link.id_cliente), ['id_cliente', 'codigo', 'nombre', 'slug']),
      precio_venta: link.precio_venta,
      activo: link.activo
    }))
  }));
}

export async function getProduct(id) {
  const products = await listProducts();
  return products.find((product) => product.id_producto === id) || null;
}

async function kitComponents(kitIds) {
  const links = await findMany('lc_kit_producto', { inFilters: { id_kit: kitIds } });
  const products = await rowsByIds('lc_producto', 'id_producto', links.map((item) => item.id_producto));
  const types = await rowsByIds('lc_tipo_producto', 'id_tipo_producto', products.map((item) => item.id_tipo_producto));
  const productsById = new Map(products.map((item) => [item.id_producto, item]));
  const typesById = new Map(types.map((item) => [item.id_tipo_producto, item]));
  return { links, productsById, typesById };
}

export async function listKits() {
  const [kits, kitClients, clients] = await Promise.all([
    findMany('lc_kit', { orderBy: { column: 'id_kit' } }),
    findMany('lc_kit_cliente'),
    findMany('lc_cliente')
  ]);
  const { links, productsById, typesById } = await kitComponents(kits.map((item) => item.id_kit));
  const clientsById = new Map(clients.map((item) => [item.id_cliente, item]));
  return kits.map((kit) => ({
    ...pick(kit, ['id_kit', 'codigo', 'nombre', 'descripcion', 'precio_real', 'imagen_url', 'activo']),
    productos: links.filter((link) => link.id_kit === kit.id_kit).map((link) => {
      const product = productsById.get(link.id_producto);
      const type = product ? typesById.get(product.id_tipo_producto) : null;
      return {
        ...pick(product, ['id_producto', 'codigo', 'nombre']),
        tipo: type?.codigo || null,
        cantidad: link.cantidad,
        orden: link.orden,
        activo: link.activo
      };
    }).sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    clientes: kitClients.filter((link) => link.id_kit === kit.id_kit).map((link) => ({
      cliente: pick(clientsById.get(link.id_cliente), ['id_cliente', 'codigo', 'nombre', 'slug']),
      precio_venta: link.precio_venta,
      activo: link.activo
    }))
  }));
}

export async function getKit(id) {
  const kits = await listKits();
  return kits.find((kit) => kit.id_kit === id) || null;
}
