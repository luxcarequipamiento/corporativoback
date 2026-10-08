import { readFileSync, writeFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../data/chevrolet-catalog.json',import.meta.url),'utf8'));
const modelCodes = { 'COLORADO WT':'CWT', 'SILVERADO':'SIL', 'N-400':'N400', 'GROOVE':'GRO', 'TRACKER':'TRA', 'CAPTIVA':'CAP', 'TRAVERSE':'TRV', 'SAIL':'SAI', 'TAHOE':'TAH', 'SUBURBAN':'SUB' };
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = catalog.models.flatMap((model) => model.items.map((item) => {
  const modelCode = modelCodes[model.name];
  if (!modelCode) throw new Error('Modelo sin codigo');
  const code = `CHEV-XLS-${modelCode}-${String(item.sourceRow).padStart(3,'0')}`;
  return { codigo_modelo:modelCode, nombre_modelo:model.name, codigo_producto:code, nombre_producto:item.name, precio_venta:item.price, orden:item.sourceRow };
}));
const sql = `-- CARGAR CATALOGO CHEVROLET EN SUPABASE
-- Fuente: ${catalog.source} | Hoja1 | 121 opciones / 10 modelos.
-- Importacion atomica en un solo bloque DO, sin tablas temporales.
-- Ejecutar COMPLETO en Supabase > SQL Editor. No hace falta volver a ejecutar el SQL de limpieza.
-- Moneda: USD, interpretando el encabezado PRECIO $. Cambiar v_moneda si corresponde.
-- Reutiliza los modelos existentes; no elimina productos globales ni datos de Ford.
-- precio_real no se importa: el Excel solo contiene precios de venta.
-- Para productos nuevos se conserva el valor por defecto de precio_real en la base de datos.
DO $import$
DECLARE
  v_cliente public.lc_cliente.id_cliente%TYPE;
  v_tipo public.lc_tipo_producto.id_tipo_producto%TYPE;
  v_modelo public.lc_modelo.id_modelo%TYPE;
  v_producto public.lc_producto.id_producto%TYPE;
  v_moneda varchar(3) := '${catalog.currency}';
  v_datos jsonb := ${literal(JSON.stringify(rows, null, 2))}::jsonb;
  v_total integer;
  v_row record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('luxcar:chevrolet:excel-import'));
  ALTER TABLE public.lc_producto_cliente ADD COLUMN IF NOT EXISTS moneda varchar(3) NOT NULL DEFAULT 'PEN';
  ALTER TABLE public.lc_producto_cliente ADD COLUMN IF NOT EXISTS orden integer;

  SELECT count(*) INTO v_total FROM public.lc_cliente WHERE slug='chevrolet' AND activo IS DISTINCT FROM false;
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'Debe existir exactamente un cliente activo con slug chevrolet. No se importo nada.';
  END IF;
  SELECT id_cliente INTO STRICT v_cliente FROM public.lc_cliente WHERE slug='chevrolet' AND activo IS DISTINCT FROM false;

  SELECT count(*) INTO v_total FROM public.lc_tipo_producto WHERE codigo='ACC';
  IF v_total > 1 THEN RAISE EXCEPTION 'Hay mas de un tipo de producto ACC'; END IF;
  IF v_total=0 THEN
    INSERT INTO public.lc_tipo_producto (codigo,nombre,activo)
      VALUES ('ACC','Accesorio',true) RETURNING id_tipo_producto INTO v_tipo;
  ELSE
    SELECT id_tipo_producto INTO STRICT v_tipo FROM public.lc_tipo_producto WHERE codigo='ACC';
    IF NOT EXISTS (SELECT 1 FROM public.lc_tipo_producto WHERE id_tipo_producto=v_tipo AND activo IS DISTINCT FROM false) THEN
      RAISE EXCEPTION 'El tipo ACC esta inactivo; activar antes de importar';
    END IF;
  END IF;

  -- Solo modifica los productos exclusivos de esta importacion.
  IF EXISTS (
    SELECT 1 FROM public.lc_producto p
    JOIN jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer) ON i.codigo_producto=p.codigo
    JOIN public.lc_producto_cliente pc ON pc.id_producto=p.id_producto
    WHERE pc.id_cliente<>v_cliente
  ) THEN RAISE EXCEPTION 'Un codigo CHEV-XLS esta vinculado a otro cliente; no se modifico nada'; END IF;

  FOR v_row IN SELECT * FROM jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer) ORDER BY codigo_modelo,orden LOOP
    SELECT count(*) INTO v_total FROM public.lc_modelo WHERE codigo_modelo=v_row.codigo_modelo;
    IF v_total>1 THEN RAISE EXCEPTION 'Modelo duplicado: %',v_row.codigo_modelo; END IF;
    IF v_total=0 THEN
      INSERT INTO public.lc_modelo (codigo_modelo,nombre_modelo)
        VALUES (v_row.codigo_modelo,v_row.nombre_modelo) RETURNING id_modelo INTO v_modelo;
    ELSE
      SELECT id_modelo INTO STRICT v_modelo FROM public.lc_modelo WHERE codigo_modelo=v_row.codigo_modelo;
      IF NOT EXISTS (SELECT 1 FROM public.lc_modelo WHERE id_modelo=v_modelo AND upper(trim(nombre_modelo))=v_row.nombre_modelo) THEN
        RAISE EXCEPTION 'El codigo de modelo % tiene otro nombre; revisar antes de importar',v_row.codigo_modelo;
      END IF;
    END IF;

    SELECT count(*) INTO v_total FROM public.lc_producto WHERE codigo=v_row.codigo_producto;
    IF v_total>1 THEN RAISE EXCEPTION 'Producto duplicado: %',v_row.codigo_producto; END IF;
    IF v_total=0 THEN
      INSERT INTO public.lc_producto (id_tipo_producto,id_modelo,codigo,nombre,activo)
        VALUES (v_tipo,v_modelo,v_row.codigo_producto,v_row.nombre_producto,true)
        RETURNING id_producto INTO v_producto;
    ELSE
      SELECT id_producto INTO STRICT v_producto FROM public.lc_producto WHERE codigo=v_row.codigo_producto;
      UPDATE public.lc_producto
        SET id_tipo_producto=v_tipo,id_modelo=v_modelo,nombre=v_row.nombre_producto,activo=true
        WHERE id_producto=v_producto;
    END IF;

    SELECT count(*) INTO v_total FROM public.lc_producto_cliente WHERE id_cliente=v_cliente AND id_producto=v_producto;
    IF v_total>1 THEN RAISE EXCEPTION 'Asociacion duplicada: %',v_row.codigo_producto; END IF;
    IF v_total=0 THEN
      INSERT INTO public.lc_producto_cliente (id_cliente,id_producto,precio_venta,moneda,orden,activo)
        VALUES (v_cliente,v_producto,v_row.precio_venta,v_moneda,v_row.orden,true);
    ELSE
      UPDATE public.lc_producto_cliente
        SET precio_venta=v_row.precio_venta,moneda=v_moneda,orden=v_row.orden,activo=true
        WHERE id_cliente=v_cliente AND id_producto=v_producto;
    END IF;
  END LOOP;

  -- Retira de la vista solo las asociaciones anteriores de Chevrolet.
  UPDATE public.lc_producto_cliente pc SET activo=false
    WHERE pc.id_cliente=v_cliente AND NOT EXISTS (
      SELECT 1 FROM public.lc_producto p JOIN jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer) ON i.codigo_producto=p.codigo
      WHERE p.id_producto=pc.id_producto
    );
  UPDATE public.lc_kit_cliente SET activo=false WHERE id_cliente=v_cliente;

  SELECT count(*) INTO v_total FROM public.lc_producto_cliente pc
    JOIN public.lc_producto p ON p.id_producto=pc.id_producto
    JOIN jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer) ON i.codigo_producto=p.codigo
    WHERE pc.id_cliente=v_cliente AND pc.activo IS DISTINCT FROM false;
  IF v_total<>121 THEN RAISE EXCEPTION 'Se esperaban 121 opciones; se obtuvieron %',v_total; END IF;
END
$import$;

-- Resultado esperado: 10 filas, con un total de 121 opciones.
SELECT m.nombre_modelo AS modelo,count(*) AS opciones,min(pc.moneda) AS moneda
FROM public.lc_producto_cliente pc
JOIN public.lc_cliente c ON c.id_cliente=pc.id_cliente
JOIN public.lc_producto p ON p.id_producto=pc.id_producto
JOIN public.lc_modelo m ON m.id_modelo=p.id_modelo
WHERE c.slug='chevrolet' AND pc.activo IS DISTINCT FROM false AND p.activo IS DISTINCT FROM false
GROUP BY m.nombre_modelo ORDER BY m.nombre_modelo;

`;
writeFileSync(new URL('./cargar-catalogo-chevrolet-supabase.sql',import.meta.url),sql);
console.log(`SQL generado: ${rows.length} opciones.`);