-- Ejecutar completo en el SQL Editor de Supabase.
-- Clasifica productos activos de Chevrolet y Ford; conserva precios y asociaciones.
BEGIN;

DO $classification$
DECLARE
  accessory_id public.lc_tipo_producto.id_tipo_producto%TYPE;
  service_id public.lc_tipo_producto.id_tipo_producto%TYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('luxcar-product-classification'));
  IF NOT EXISTS (SELECT 1 FROM public.lc_tipo_producto WHERE codigo = 'ACC') THEN
    INSERT INTO public.lc_tipo_producto (codigo, nombre, activo) VALUES ('ACC', 'Accesorios', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lc_tipo_producto WHERE codigo = 'SER') THEN
    INSERT INTO public.lc_tipo_producto (codigo, nombre, activo) VALUES ('SER', 'Servicios', true);
  END IF;
  SELECT id_tipo_producto INTO STRICT accessory_id FROM public.lc_tipo_producto WHERE codigo = 'ACC';
  SELECT id_tipo_producto INTO STRICT service_id FROM public.lc_tipo_producto WHERE codigo = 'SER';
  UPDATE public.lc_tipo_producto SET nombre = 'Accesorios', activo = true WHERE id_tipo_producto = accessory_id;
  UPDATE public.lc_tipo_producto SET nombre = 'Servicios', activo = true WHERE id_tipo_producto = service_id;

  WITH eligible AS (
    SELECT p.id_producto,
      regexp_replace(translate(lower(trim(p.nombre)), 'áéíóúüñ', 'aeiouun'), '[[:space:]]+', ' ', 'g') AS name
    FROM public.lc_producto p
    WHERE p.activo IS DISTINCT FROM false
      AND p.id_tipo_producto IN (accessory_id, service_id)
      AND EXISTS (
        SELECT 1 FROM public.lc_producto_cliente pc
        JOIN public.lc_cliente c ON c.id_cliente = pc.id_cliente
        WHERE pc.id_producto = p.id_producto AND pc.activo IS DISTINCT FROM false
          AND c.activo IS DISTINCT FROM false AND c.slug IN ('chevrolet', 'ford')
      )
  )
  UPDATE public.lc_producto p SET id_tipo_producto = CASE
    WHEN e.name ~ '^tapiz' OR e.name ~ '^undercoating( |$)'
      OR (e.name ~ '^polarizado' AND e.name ~ 'nano[ -]?ceram')
      OR (e.name ~ '^tratamiento' AND e.name ~ 'ceram')
    THEN service_id ELSE accessory_id END
  FROM eligible e WHERE e.id_producto = p.id_producto;
END $classification$;

COMMIT;

-- Comprobación: servicios y sus modelos/precios por cliente.
SELECT c.nombre AS cliente, m.nombre_modelo AS modelo, p.nombre AS servicio,
  pc.precio_venta, pc.moneda
FROM public.lc_producto p
JOIN public.lc_tipo_producto t ON t.id_tipo_producto = p.id_tipo_producto
JOIN public.lc_producto_cliente pc ON pc.id_producto = p.id_producto
JOIN public.lc_cliente c ON c.id_cliente = pc.id_cliente
LEFT JOIN public.lc_modelo m ON m.id_modelo = p.id_modelo
WHERE t.codigo = 'SER' AND p.activo IS DISTINCT FROM false
  AND pc.activo IS DISTINCT FROM false AND c.slug IN ('chevrolet', 'ford')
ORDER BY c.nombre, m.nombre_modelo, p.nombre;
