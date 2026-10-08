-- Ejecutar en Supabase SQL Editor ANTES de publicar el backend actualizado.
-- Conserva mensajes y archivos. Los historiales ambiguos quedan solo para ADMIN.
BEGIN;

ALTER TABLE public.lc_conversacion
  ADD COLUMN IF NOT EXISTS id_usuario bigint REFERENCES public.lc_usuario(id_usuario);

-- Eliminar solo la unicidad antigua por cliente, conservando las demas restricciones.
DO $$
DECLARE
  cliente_att smallint;
  item record;
BEGIN
  SELECT attnum INTO cliente_att FROM pg_attribute
    WHERE attrelid = 'public.lc_conversacion'::regclass AND attname = 'id_cliente';
  FOR item IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.lc_conversacion'::regclass AND contype = 'u'
      AND conkey = ARRAY[cliente_att]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.lc_conversacion DROP CONSTRAINT %I', item.conname);
  END LOOP;
  FOR item IN SELECT i.indexrelid::regclass AS index_name FROM pg_index i
    WHERE i.indrelid = 'public.lc_conversacion'::regclass AND i.indisunique
      AND NOT i.indisprimary AND i.indnkeyatts = 1 AND i.indkey[0] = cliente_att
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX %s', item.index_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS lc_conversacion_cliente_usuario_uidx
  ON public.lc_conversacion (id_cliente, id_usuario);

-- Recuperar un historial solo cuando hay un unico usuario activo vinculado
-- y todos los mensajes no administrativos pertenecen a ese mismo usuario.
WITH unico_usuario AS (
  SELECT id_cliente, min(id_usuario) AS id_usuario
  FROM public.lc_usuario_cliente
  WHERE activo IS DISTINCT FROM false
  GROUP BY id_cliente HAVING count(DISTINCT id_usuario) = 1
)
UPDATE public.lc_conversacion c SET id_usuario = u.id_usuario
FROM unico_usuario u
WHERE c.id_cliente = u.id_cliente AND c.id_usuario IS NULL
  AND EXISTS (SELECT 1 FROM public.lc_usuario p WHERE p.id_usuario = u.id_usuario AND p.activo IS DISTINCT FROM false)
  AND EXISTS (SELECT 1 FROM public.lc_mensaje m WHERE m.id_conversacion = c.id_conversacion AND m.id_usuario_remitente = u.id_usuario)
  AND NOT EXISTS (
    SELECT 1 FROM public.lc_mensaje m
    WHERE m.id_conversacion = c.id_conversacion AND m.id_usuario_remitente <> u.id_usuario
      AND NOT EXISTS (
        SELECT 1 FROM public.lc_usuario_aplicacion ua
        JOIN public.lc_aplicacion a ON a.id_aplicacion = ua.id_aplicacion
        JOIN public.lc_rol r ON r.id_rol = ua.id_rol
        WHERE ua.id_usuario = m.id_usuario_remitente
          AND ua.activo IS DISTINCT FROM false AND a.activo IS DISTINCT FROM false
          AND r.activo IS DISTINCT FROM false AND a.codigo = 'CORPORATIVO' AND r.codigo = 'ADMIN'
      )
  )
  AND NOT EXISTS (SELECT 1 FROM public.lc_conversacion owned WHERE owned.id_cliente = c.id_cliente AND owned.id_usuario = u.id_usuario);

-- Actualizar tambien la funcion usada por las politicas existentes.
CREATE OR REPLACE FUNCTION public.lc_puede_ver_conversacion(p_id_conversacion bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.lc_es_admin_corporativo() OR EXISTS (
    SELECT 1 FROM public.lc_conversacion c
    JOIN public.lc_usuario u ON u.id_usuario = c.id_usuario
    JOIN public.lc_usuario_cliente uc ON uc.id_usuario = u.id_usuario AND uc.id_cliente = c.id_cliente
    JOIN public.lc_cliente cl ON cl.id_cliente = c.id_cliente
    JOIN public.lc_usuario_aplicacion ua ON ua.id_usuario = u.id_usuario
    JOIN public.lc_aplicacion a ON a.id_aplicacion = ua.id_aplicacion
    JOIN public.lc_rol r ON r.id_rol = ua.id_rol
    WHERE c.id_conversacion = p_id_conversacion AND u.id_auth = auth.uid()
      AND u.activo IS DISTINCT FROM false AND uc.activo IS DISTINCT FROM false
      AND cl.activo IS DISTINCT FROM false AND ua.activo IS DISTINCT FROM false
      AND a.activo IS DISTINCT FROM false AND r.activo IS DISTINCT FROM false
      AND a.codigo = 'CORPORATIVO' AND r.codigo = 'CLIENTE'
  );
$$;

-- Politicas restrictivas: las politicas anteriores no pueden dar acceso
-- a otro usuario de la misma empresa. No se amplian permisos existentes.
ALTER TABLE public.lc_conversacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lc_conversacion_usuario_aislado ON public.lc_conversacion;
CREATE POLICY lc_conversacion_usuario_aislado ON public.lc_conversacion
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (public.lc_puede_ver_conversacion(id_conversacion))
WITH CHECK (
  public.lc_es_admin_corporativo() OR EXISTS (
    SELECT 1 FROM public.lc_usuario u
    JOIN public.lc_usuario_cliente uc ON uc.id_usuario = u.id_usuario
    WHERE u.id_auth = auth.uid() AND u.id_usuario = lc_conversacion.id_usuario
      AND uc.id_cliente = lc_conversacion.id_cliente
      AND u.activo IS DISTINCT FROM false AND uc.activo IS DISTINCT FROM false
  )
);

ALTER TABLE public.lc_mensaje ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lc_mensaje_usuario_aislado ON public.lc_mensaje;
CREATE POLICY lc_mensaje_usuario_aislado ON public.lc_mensaje
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (public.lc_puede_ver_conversacion(id_conversacion))
WITH CHECK (public.lc_puede_ver_conversacion(id_conversacion));

ALTER TABLE public.lc_conversacion_lectura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lc_lectura_usuario_aislado ON public.lc_conversacion_lectura;
CREATE POLICY lc_lectura_usuario_aislado ON public.lc_conversacion_lectura
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (public.lc_puede_ver_conversacion(id_conversacion))
WITH CHECK (public.lc_puede_ver_conversacion(id_conversacion));

ALTER TABLE public.lc_mensaje_archivo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lc_archivo_usuario_aislado ON public.lc_mensaje_archivo;
CREATE POLICY lc_archivo_usuario_aislado ON public.lc_mensaje_archivo
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.lc_mensaje m WHERE m.id_mensaje = lc_mensaje_archivo.id_mensaje AND public.lc_puede_ver_conversacion(m.id_conversacion)))
WITH CHECK (EXISTS (SELECT 1 FROM public.lc_mensaje m WHERE m.id_mensaje = lc_mensaje_archivo.id_mensaje AND public.lc_puede_ver_conversacion(m.id_conversacion)));

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Comprobacion: id_usuario NULL significa historial anterior solo para ADMIN.
SELECT id_conversacion, id_cliente, id_usuario, estado
FROM public.lc_conversacion ORDER BY id_cliente, id_usuario;
