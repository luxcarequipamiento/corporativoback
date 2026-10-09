import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { catalogToPrices } from '../../frontend/src/catalog.js';
import { quoteTotals } from '../../frontend/src/quote-utils.js';
import { isActive, unique } from '../src/utils/database.js';
import { AppError } from '../src/middleware/errors.js';
const sql = readFileSync(new URL('../scripts/cargar-catalogo-chevrolet-supabase.sql',import.meta.url),'utf8');
const catalog = JSON.parse(readFileSync(new URL('../data/chevrolet-catalog.json',import.meta.url),'utf8'));
const sheet = JSON.parse(readFileSync(new URL('../data/sheet1.source.json',import.meta.url),'utf8').replace(/^\uFEFF/, ''));
const sourceCell = (name) => sheet.rows.flatMap((row) => row.cells).find((cell) => cell.cell===name)?.value;

const schema = `
CREATE TABLE lc_cliente (id_cliente bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,slug varchar(100),nombre varchar(150) NOT NULL,activo boolean NOT NULL DEFAULT true);
CREATE TABLE lc_modelo (id_modelo bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo_modelo text NOT NULL,nombre_modelo text);
CREATE TABLE lc_tipo_producto (id_tipo_producto bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo varchar(30) NOT NULL,nombre varchar(100) NOT NULL,activo boolean NOT NULL DEFAULT true);
CREATE TABLE lc_producto (id_producto bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,id_tipo_producto bigint NOT NULL REFERENCES lc_tipo_producto,id_modelo bigint REFERENCES lc_modelo,codigo varchar(50) NOT NULL,nombre varchar(150) NOT NULL,descripcion text,imagen_url text,precio_real numeric NOT NULL DEFAULT 0,activo boolean NOT NULL DEFAULT true);
CREATE TABLE lc_producto_cliente (id_producto_cliente bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,id_producto bigint NOT NULL REFERENCES lc_producto,id_cliente bigint NOT NULL REFERENCES lc_cliente,precio_venta numeric NOT NULL,activo boolean NOT NULL DEFAULT true);
CREATE TABLE lc_kit_cliente (id_kit_cliente bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,id_cliente bigint NOT NULL REFERENCES lc_cliente,id_kit bigint,activo boolean NOT NULL DEFAULT true);
CREATE TABLE lc_servicio_paquete (id_servicio_paquete bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,activo boolean DEFAULT true);
INSERT INTO lc_cliente (slug,nombre) VALUES ('chevrolet','Chevrolet'),('ford','Ford');
INSERT INTO lc_tipo_producto(codigo,nombre) VALUES ('ACC','Accesorio');
INSERT INTO lc_modelo(codigo_modelo,nombre_modelo) VALUES ('CWT','COLORADO WT'),('SIL','SILVERADO'),('N400','N-400'),('GRO','GROOVE'),('TRA','TRACKER'),('CAP','CAPTIVA'),('TRV','TRAVERSE'),('SAI','SAIL'),('TAH','TAHOE'),('SUB','SUBURBAN'),('FORD','RANGER');
INSERT INTO lc_producto(id_tipo_producto,id_modelo,codigo,nombre,precio_real) VALUES (1,11,'OLD-SHARED','Shared accessory',55);
INSERT INTO lc_producto_cliente(id_producto,id_cliente,precio_venta) VALUES (1,1,120),(1,2,150);
INSERT INTO lc_kit_cliente(id_cliente,id_kit) VALUES (1,1),(2,2);
`;

function serviceFor(db) {
  const findById = async (table,column,id) => (await db.query(`SELECT * FROM ${table} WHERE ${column}=$1`,[id])).rows[0] || null;
  const findMany = async (table,{ filters={},inFilters={} }={}) => (await db.query(`SELECT * FROM ${table}`)).rows.filter((row) => Object.entries(filters).every(([key,value]) => row[key]===value) && Object.entries(inFilters).every(([key,values]) => values.includes(row[key])));
  const source = readFileSync(new URL('../src/services/catalog.service.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replaceAll('export async function ','async function ');
  return new Function('AppError','findById','findMany','isActive','unique',source+'\nreturn {getClientProducts,getClientKits,getClientServicePackages};')(AppError,findById,findMany,isActive,unique);
}

test('Chevrolet SQL executes against PostgreSQL and the backend reads the imported database catalog', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(schema);
    await t.test('imports all 131 spreadsheet prices under 10 existing models',async () => {
      const [importStatement, summaryStatement] = sql.split('-- Resultado esperado:');
      await db.query(importStatement);
      const summary = await db.query('-- Resultado esperado:' + summaryStatement);
      assert.equal(summary.rows.length,10);
      assert.equal(summary.rows.reduce((total,row) => total + Number(row.opciones),0),131);
      const result = await db.query(`SELECT p.nombre,m.nombre_modelo,pc.precio_venta,pc.moneda,pc.orden FROM lc_producto_cliente pc JOIN lc_producto p USING(id_producto) JOIN lc_modelo m USING(id_modelo) WHERE pc.id_cliente=1 AND pc.activo=true`);
      assert.equal(result.rows.length,131);
      assert.equal((await db.query('SELECT * FROM lc_modelo')).rows.length,11);
      for (const model of catalog.models) for (const item of model.items) {
        const imported = result.rows.find((row) => row.nombre_modelo===model.name && row.orden===item.sourceRow);
        assert.ok(imported);
        assert.equal(imported.nombre,item.name);
        assert.equal(Number(imported.precio_venta),Math.round(Number(sourceCell(item.sourceCell))*100)/100);
        assert.equal(imported.moneda,catalog.currency);
      }
    });
    await t.test('repeated import updates prices without duplicating rows or replacing real costs',async () => {
      await db.exec(`UPDATE lc_producto SET precio_real=80 WHERE codigo='CHEV-XLS-CWT-005'; UPDATE lc_producto_cliente SET precio_venta=999 WHERE id_producto=(SELECT id_producto FROM lc_producto WHERE codigo='CHEV-XLS-CWT-005');`);
      await db.exec(sql);
      assert.equal((await db.query('SELECT * FROM lc_producto')).rows.length,132);
      assert.equal((await db.query('SELECT * FROM lc_producto_cliente')).rows.length,133);
      const row = (await db.query(`SELECT p.precio_real,pc.precio_venta FROM lc_producto p JOIN lc_producto_cliente pc USING(id_producto) WHERE p.codigo='CHEV-XLS-CWT-005'`)).rows[0];
      assert.equal(Number(row.precio_real),80);
      assert.equal(Number(row.precio_venta),748.48);
    });
    await t.test('only previous Chevrolet associations are disabled; Ford and shared products retain values',async () => {
      const old = (await db.query(`SELECT * FROM lc_producto_cliente WHERE id_producto=1 ORDER BY id_cliente`)).rows;
      assert.equal(old[0].activo,false);
      assert.equal(old[1].activo,true);
      assert.equal(Number(old[1].precio_venta),150);
      assert.equal(Number((await db.query('SELECT precio_real FROM lc_producto WHERE id_producto=1')).rows[0].precio_real),55);
      const kits = (await db.query('SELECT * FROM lc_kit_cliente ORDER BY id_cliente')).rows;
      assert.equal(kits[0].activo,false);
      assert.equal(kits[1].activo,true);
    });
    await t.test('backend reads live database changes and preserves USD and source order for quotes',async () => {
      const service = serviceFor(db);
      const products = await service.getClientProducts(1,'ACC');
      assert.equal(products.length,71);
      assert.equal((await service.getClientProducts(1,'SER')).length,60);
      const modelId = products[0].modelo.id_modelo;
      const modelProducts = await service.getClientProducts(1, 'ACC', modelId);
      assert.deepEqual(modelProducts, products.filter(product => product.modelo.id_modelo === modelId));
      assert.ok(modelProducts.length < products.length);
      assert.ok(products.every((product) => product.id_producto!==1));
      const prices = catalogToPrices({productos:products});
      const first = prices.accessories.find((group) => group.name==='COLORADO WT').items[0];
      assert.equal(first.unitPrice,74848);
      assert.equal(first.currency,'USD');
      assert.deepEqual(quoteTotals([{...first,quantity:2}]).totals,[{currency:'USD',amount:149696}]);
      await db.exec(`UPDATE lc_producto_cliente SET precio_venta=700 WHERE id_producto=(SELECT id_producto FROM lc_producto WHERE codigo='CHEV-XLS-CWT-005')`);
      const updated = await service.getClientProducts(1,'ACC');
      assert.equal(Number(updated.find((product) => product.codigo==='CHEV-XLS-CWT-005').precio_venta),700);
      assert.deepEqual(await service.getClientKits(1),[]);
      assert.deepEqual(await service.getClientServicePackages(1),[]);
      const ford = await service.getClientProducts(2,'ACC');
      assert.equal(ford.length,1);
      assert.equal(ford[0].moneda,'PEN');
    });
    await t.test('classification SQL separates services without changing prices and is repeatable', async () => {
      const classification = readFileSync(new URL('../scripts/clasificar-accesorios-servicios.sql', import.meta.url), 'utf8');
      const before = (await db.query('SELECT * FROM lc_producto_cliente ORDER BY id_producto_cliente')).rows;
      await db.exec(classification);
      const service = serviceFor(db);
      const services = await service.getClientProducts(1, 'SER');
      const accessories = await service.getClientProducts(1, 'ACC');
      assert.ok(services.length > 0);
      assert.equal(services.length + accessories.length, 131);
      assert.ok(services.some(item => item.nombre.startsWith('Tapizado')));
      assert.ok(services.some(item => item.nombre.includes('Nanocerámico')));
      assert.ok(services.some(item => item.nombre === 'Undercoating'));
      assert.ok(accessories.every(item => !/^(Tapiz|Polarizado|Undercoating|Tratamiento)/i.test(item.nombre)));
      assert.deepEqual((await db.query('SELECT * FROM lc_producto_cliente ORDER BY id_producto_cliente')).rows, before);
      await db.exec(classification);
      assert.deepEqual(await service.getClientProducts(1, 'SER'), services);
    });
    await t.test('invalid client rolls the SQL transaction back and remains blocked in the backend',async () => {
      await db.exec("UPDATE lc_cliente SET activo=false WHERE id_cliente=1;");
      await assert.rejects(db.exec(sql),/cliente activo/);
      await db.exec('ROLLBACK;');
      assert.equal((await db.query('SELECT * FROM lc_producto')).rows.length,132);
      const service = serviceFor(db);
      await assert.rejects(service.getClientProducts(1),{status:404});
      await assert.rejects(service.getClientProducts(999),{status:404});
      await assert.rejects(service.getClientKits(1),{status:404});
      await assert.rejects(service.getClientServicePackages(1),{status:404});
    });
  } finally { await db.close(); }
});
