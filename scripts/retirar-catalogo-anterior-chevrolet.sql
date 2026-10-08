-- Ejecutar manualmente en Supabase SQL Editor, despues de desplegar el nuevo backend.
-- Retira SOLO las asociaciones del catalogo anterior del cliente slug='chevrolet'.
-- No elimina productos, modelos, kits globales, usuarios ni mensajes.
-- NO volver a ejecutar despues de cargar el nuevo catalogo en Supabase. La importacion completa ya limpia las asociaciones anteriores.
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.lc_cliente WHERE slug = 'chevrolet') <> 1 THEN
    RAISE EXCEPTION 'Debe existir exactamente un cliente con slug chevrolet';
  END IF;
END $$;

-- Resultado de la revision previa (guardar antes de ejecutar los DELETE).
SELECT c.id_cliente, c.nombre, c.slug,
  (SELECT count(*) FROM public.lc_producto_cliente p WHERE p.id_cliente = c.id_cliente) AS asociaciones_productos,
  (SELECT count(*) FROM public.lc_kit_cliente k WHERE k.id_cliente = c.id_cliente) AS asociaciones_kits
FROM public.lc_cliente c WHERE c.slug = 'chevrolet';

DELETE FROM public.lc_kit_cliente
WHERE id_cliente IN (SELECT id_cliente FROM public.lc_cliente WHERE slug = 'chevrolet');

DELETE FROM public.lc_producto_cliente
WHERE id_cliente IN (SELECT id_cliente FROM public.lc_cliente WHERE slug = 'chevrolet');

COMMIT;