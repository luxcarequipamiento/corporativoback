import { createHash } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/errors.js';
import { getClientProducts, getClientKits, getClientServicePackages } from './catalog.service.js';
import { assertDatabaseResult } from '../utils/database.js';

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const priceOf = value => value === null || value === undefined || value === '' ? null : Math.round(Number(value) * 100);

export function createOrderService({ database = supabase, loadProducts = getClientProducts, loadKits = getClientKits, loadPackages = getClientServicePackages } = {}) {
  return async function saveOrder(context, body) {
    body ||= {};
    if (!context.client || context.role.codigo !== 'CLIENTE') throw new AppError(403, 'Cliente no autorizado');
    if (!['purchase', 'services'].includes(body.documentType) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId || '')) throw new AppError(400, 'Solicitud de orden inválida');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 1000) throw new AppError(400, 'La orden no tiene conceptos válidos');
    if (body.items.some(item => !item || typeof item !== 'object')) throw new AppError(400, 'Concepto de orden inválido');
    if (new Set(body.items.map(item => item.model)).size !== 1) throw new AppError(400, 'Cada orden debe corresponder a un único modelo de vehículo');
    const details = { vehicle: text(body.details?.vehicle, 100), vin: text(body.details?.vin, 100), notes: text(body.details?.notes, 1200) };
    const inputItems = body.items.map(item => {
      if (!['accessories', 'services', 'kits'].includes(item.type) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw new AppError(400, 'Cantidad o tipo de producto inválido');
      return { id: String(item.id), model: String(item.model), type: item.type, quantity: item.quantity, unitPrice: item.unitPrice, currency: item.currency };
    });
    const selected = inputItems.filter(item => body.documentType === 'services' ? item.type === 'services' : item.type !== 'services');
    if (!selected.length) throw new AppError(400, 'No hay conceptos para este tipo de orden');
    if (new Set(inputItems.map(item => `${item.type}:${item.id}`)).size !== inputItems.length) throw new AppError(400, 'La orden contiene productos duplicados');
    const fingerprint = createHash('sha256').update(JSON.stringify({ details, items: inputItems })).digest('hex');
    const table = body.documentType === 'services' ? 'lc_orden_servicio' : 'lc_orden_compra';
    const masterResult = await database.from('lc_orden_maestra').select('*').eq('id_cliente', context.client.id).eq('id_usuario', context.user.id).eq('solicitud', body.requestId).maybeSingle();
    assertDatabaseResult(masterResult.error, 'No fue posible consultar las órdenes. Comprueba que ejecutaste el SQL de órdenes.');
    if (masterResult.data) {
      if (masterResult.data.datos.fingerprint !== fingerprint) throw new AppError(409, 'La cotización cambió; crea una nueva orden');
      const saved = await database.from(table).select('*').eq('id_orden', masterResult.data.id_orden).maybeSingle();
      assertDatabaseResult(saved.error);
      if (saved.data) return { ...saved.data, datos: masterResult.data.datos };
    }
    const [products, kits, packages] = await Promise.all([
      loadProducts(context.client.id),
      selected.some(item => item.type === 'kits') ? loadKits(context.client.id) : [],
      selected.some(item => item.type === 'services' && !item.id.startsWith('product-')) ? loadPackages(context.client.id) : []
    ]);
    let modelId;
    const concepts = selected.map(item => {
      let source, components = [], model;
      if (item.type === 'accessories' || item.type === 'services' && item.id.startsWith('product-')) {
        source = products.find(product => String(product.id_producto) === item.id.replace(/^product-/, '') && product.tipo_producto.codigo === (item.type === 'services' ? 'SER' : 'ACC'));
        model = source?.modelo;
      } else {
        const collection = item.type === 'kits' ? kits : packages;
        source = collection.find(entry => (entry.productos || []).some(product => `${entry.id_kit || entry.id_servicio_paquete}-${product.modelo?.id_modelo}` === item.id && product.modelo?.nombre_modelo === item.model)
          || `${entry.id_kit || entry.id_servicio_paquete}-${entry.modelo?.id_modelo}` === item.id && entry.modelo?.nombre_modelo === item.model);
        components = (source?.productos || []).filter(product => product.modelo?.nombre_modelo === item.model);
        model = components[0]?.modelo || source?.modelo;
      }
      if (!source || !model || model.nombre_modelo !== item.model) throw new AppError(400, 'Producto no disponible para el cliente o modelo seleccionado');
      if (modelId && modelId !== model.id_modelo) throw new AppError(400, 'La orden debe corresponder a un único modelo');
      modelId = model.id_modelo;
      const unitPrice = priceOf(source.precio_venta), currency = source.moneda || 'PEN';
      if (unitPrice !== item.unitPrice || currency !== item.currency) throw new AppError(409, 'El precio del catálogo cambió. Recarga la página y vuelve a crear la cotización.');
      return { id: item.id, model: model.nombre_modelo, name: source.nombre, type: item.type, quantity: item.quantity, unitPrice, currency,
        products: components.map(product => ({ id: product.id_producto, name: product.nombre, quantity: product.cantidad || 1 })) };
    });
    const totals = new Map();
    for (const item of concepts) {
      if (item.unitPrice === null) continue;
      const amount = item.unitPrice * item.quantity, base = Math.round(amount / 1.18);
      const total = totals.get(item.currency) || { currency: item.currency, base: 0, tax: 0, price: 0 };
      total.base += base; total.tax += amount - base; total.price += amount;
      totals.set(item.currency, total);
    }
    const data = masterResult.data?.datos || { modelo: concepts[0].model, cliente: context.client.nombre, asesor: context.user.nombre, ...details, fingerprint };
    const result = await database.rpc('lc_guardar_orden', { p_cliente: context.client.id, p_usuario: context.user.id, p_modelo: modelId,
      p_solicitud: body.requestId, p_tipo: body.documentType, p_datos: data, p_conceptos: concepts, p_totales: [...totals.values()] });
    if (result.error?.code === 'P0001') throw new AppError(409, result.error.message);
    assertDatabaseResult(result.error, 'No fue posible registrar la orden. Comprueba que ejecutaste el SQL de órdenes.');
    return result.data;
  };
}
export const saveOrder = createOrderService();
