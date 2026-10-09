import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('orders SQL links both documents and allocates repeatable, unique numbers', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE lc_cliente(id_cliente bigint PRIMARY KEY,activo boolean);
      CREATE TABLE lc_usuario(id_usuario bigint PRIMARY KEY,activo boolean);
      CREATE TABLE lc_modelo(id_modelo bigint PRIMARY KEY,nombre_modelo text);
      CREATE TABLE lc_usuario_cliente(id_usuario bigint,id_cliente bigint,activo boolean);
      INSERT INTO lc_cliente VALUES(1,true),(2,true);
      INSERT INTO lc_usuario VALUES(1,true),(2,true);
      INSERT INTO lc_usuario_cliente VALUES(1,1,true),(2,2,true);
      INSERT INTO lc_modelo VALUES(1,'Colorado');`);
    const sql = readFileSync(new URL('../migrations/20261009_ordenes_compra_servicio.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    const request = '00000000-0000-4000-8000-000000000001';
    const save = async (type, uuid = request, user = 1, client = 1, concepts) => {
      const item = { model: 'Colorado', type: type === 'services' ? 'services' : 'accessories', quantity: 1, unitPrice: 11800 };
      const result = await db.query('SELECT lc_guardar_orden($1,$2,1,$3,$4,$5,$6,$7) AS saved', [client,user,uuid,type,JSON.stringify({modelo:'Colorado'}),JSON.stringify(concepts || [item]),JSON.stringify([{currency:'USD',amount:11800}])]);
      return result.rows[0].saved;
    };
    const service = await save('services');
    assert.match(service.numero, /^\d{2}-010020$/);
    assert.deepEqual(await save('services'), service);
    const purchase = await save('purchase');
    assert.equal(purchase.id_orden, service.id_orden);
    assert.equal(purchase.numero, service.numero);
    const second = await save('services', '00000000-0000-4000-8000-000000000002', 2, 2);
    assert.match(second.numero, /^\d{2}-010021$/);
    await assert.rejects(save('services', request, 1, 2), /sin acceso/);
    await assert.rejects(save('services', request, 1, 1, [{model:'Silverado',type:'services',quantity:1}]), /mismo modelo/);
    await assert.rejects(save('services', request, 1, 1, [{model:'Colorado',type:'services',quantity:2}]), /otro contenido/);
    assert.equal((await db.query('SELECT count(*) FROM lc_orden_servicio')).rows[0].count, 2);
    process.env.SUPABASE_URL ||= 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-only-key';
    const { createOrderService } = await import('../src/services/orders.service.js');
    const database = {
      from(table) {
        const filters = [];
        return { select() { return this; }, eq(column, value) { filters.push([column,value]); return this; },
          async maybeSingle() {
            const result = await db.query(`SELECT * FROM ${table} WHERE ${filters.map(([column], i) => `${column}=$${i+1}`).join(' AND ')}`, filters.map(([,value]) => value));
            return { data: result.rows[0] || null, error: null };
          }
        };
      },
      async rpc(name, params) {
        const result = await db.query('SELECT lc_guardar_orden($1,$2,$3,$4,$5,$6,$7,$8) AS saved',
          [params.p_cliente, params.p_usuario, params.p_modelo, params.p_solicitud, params.p_tipo, JSON.stringify(params.p_datos), JSON.stringify(params.p_conceptos), JSON.stringify(params.p_totales)]);
        return { data: result.rows[0].saved, error: null };
      }
    };
    let livePrice = 20;
    const saveBackend = createOrderService({ database, loadProducts: async () => [{ id_producto: 7, nombre: 'Accesorio real', precio_venta: livePrice, moneda: 'USD', tipo_producto: { codigo: 'ACC' }, modelo: { id_modelo: 1, nombre_modelo: 'Colorado' } }] });
    const context = { client: { id: 1, nombre: 'Chevrolet' }, user: { id: 1, nombre: 'Juan Perez' }, role: { codigo: 'CLIENTE' } };
    const body = { requestId: '00000000-0000-4000-8000-000000000003', documentType: 'purchase', details: { vehicle: 'Colorado', vin: 'VIN-123', notes: 'Placa' },
      items: [{ id: 7, name: 'Nombre manipulado', model: 'Colorado', type: 'accessories', quantity: 2, unitPrice: 2000, currency: 'USD' }] };
    const saved = await saveBackend(context, body);
    assert.equal(saved.conceptos[0].name, 'Accesorio real');
    assert.equal(saved.datos.asesor, 'Juan Perez');
    assert.equal(saved.totales[0].price, 4000);
    livePrice = 30;
    assert.equal((await saveBackend(context, body)).numero, saved.numero);
    assert.equal((await saveBackend(context, body)).conceptos[0].unitPrice, 2000);
    await assert.rejects(saveBackend(context, { ...body, requestId: '00000000-0000-4000-8000-000000000004' }), /precio del catálogo cambió/);
    await assert.rejects(saveBackend(context, { ...body, items: [{ ...body.items[0], quantity: 0 }] }), /Cantidad/);
    await assert.rejects(saveBackend(context, { ...body, items: [...body.items, { ...body.items[0], model: 'Silverado' }] }), /único modelo/);
  } finally { await db.close(); }
});
