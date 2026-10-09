-- Ejecutar completo en el proyecto Supabase del corporativo.
-- Correlativos independientes por tipo y año: 26-010020, 26-010021...
BEGIN;

CREATE TABLE IF NOT EXISTS public.lc_orden_maestra (
  id_orden uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente bigint NOT NULL REFERENCES public.lc_cliente(id_cliente),
  id_usuario bigint NOT NULL REFERENCES public.lc_usuario(id_usuario),
  id_modelo bigint NOT NULL REFERENCES public.lc_modelo(id_modelo),
  solicitud uuid NOT NULL,
  datos jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, id_usuario, solicitud)
);
CREATE TABLE IF NOT EXISTS public.lc_orden_compra (
  id_orden uuid PRIMARY KEY REFERENCES public.lc_orden_maestra(id_orden),
  numero text NOT NULL UNIQUE,
  conceptos jsonb NOT NULL CHECK (jsonb_typeof(conceptos) = 'array' AND jsonb_array_length(conceptos) > 0),
  totales jsonb NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lc_orden_servicio (
  id_orden uuid PRIMARY KEY REFERENCES public.lc_orden_maestra(id_orden),
  numero text NOT NULL UNIQUE,
  conceptos jsonb NOT NULL CHECK (jsonb_typeof(conceptos) = 'array' AND jsonb_array_length(conceptos) > 0),
  totales jsonb NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lc_orden_correlativo (
  tipo text NOT NULL CHECK (tipo IN ('purchase', 'services')),
  anio integer NOT NULL,
  ultimo bigint NOT NULL DEFAULT 10019 CHECK (ultimo >= 10019),
  PRIMARY KEY (tipo, anio)
);
CREATE INDEX IF NOT EXISTS lc_orden_maestra_cliente_fecha ON public.lc_orden_maestra(id_cliente, creado_en DESC);
CREATE INDEX IF NOT EXISTS lc_orden_maestra_usuario_fecha ON public.lc_orden_maestra(id_usuario, creado_en DESC);

ALTER TABLE public.lc_orden_maestra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_orden_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_orden_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_orden_correlativo ENABLE ROW LEVEL SECURITY;
-- El backend valida la sesión y usa service_role; no se permite escritura directa desde el navegador.
REVOKE ALL ON public.lc_orden_maestra, public.lc_orden_compra, public.lc_orden_servicio, public.lc_orden_correlativo FROM anon, authenticated;
GRANT ALL ON public.lc_orden_maestra, public.lc_orden_compra, public.lc_orden_servicio, public.lc_orden_correlativo TO service_role;

CREATE OR REPLACE FUNCTION public.lc_guardar_orden(
  p_cliente bigint, p_usuario bigint, p_modelo bigint, p_solicitud uuid,
  p_tipo text, p_datos jsonb, p_conceptos jsonb, p_totales jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $function$
DECLARE
  master public.lc_orden_maestra%ROWTYPE;
  existing record;
  year_number integer := extract(year FROM timezone('America/Bogota', now()));
  serial_number bigint;
  order_number text;
  saved_at timestamptz;
BEGIN
  IF p_tipo NOT IN ('purchase', 'services') OR p_tipo IS NULL THEN RAISE EXCEPTION 'Tipo de orden invalido'; END IF;
  IF jsonb_typeof(p_conceptos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_conceptos) = 0 THEN
    RAISE EXCEPTION 'La orden no tiene conceptos';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_conceptos) item
    WHERE (item->>'model') IS DISTINCT FROM (p_datos->>'modelo')
      OR (p_tipo='services' AND (item->>'type') IS DISTINCT FROM 'services')
      OR (p_tipo='purchase' AND coalesce(item->>'type','') NOT IN ('accessories','kits'))
      OR (item->>'quantity')::integer NOT BETWEEN 1 AND 999
  ) THEN RAISE EXCEPTION 'Los conceptos deben pertenecer al mismo modelo y tipo de orden'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lc_usuario_cliente uc
    JOIN public.lc_usuario u ON u.id_usuario=uc.id_usuario
    JOIN public.lc_cliente c ON c.id_cliente=uc.id_cliente
    WHERE uc.id_usuario=p_usuario AND uc.id_cliente=p_cliente
      AND uc.activo IS DISTINCT FROM false AND u.activo IS DISTINCT FROM false AND c.activo IS DISTINCT FROM false
  ) THEN RAISE EXCEPTION 'Usuario sin acceso al cliente de la orden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lc_modelo WHERE id_modelo=p_modelo AND nombre_modelo=p_datos->>'modelo') THEN
    RAISE EXCEPTION 'Modelo de la orden invalido';
  END IF;
  INSERT INTO public.lc_orden_maestra(id_cliente,id_usuario,id_modelo,solicitud,datos)
    VALUES (p_cliente,p_usuario,p_modelo,p_solicitud,p_datos)
    ON CONFLICT (id_cliente,id_usuario,solicitud) DO NOTHING;
  SELECT * INTO STRICT master FROM public.lc_orden_maestra
    WHERE id_cliente=p_cliente AND id_usuario=p_usuario AND solicitud=p_solicitud FOR UPDATE;
  IF master.id_modelo<>p_modelo OR master.datos IS DISTINCT FROM p_datos THEN
    RAISE EXCEPTION 'La cotizacion cambio; debe generar una nueva orden';
  END IF;
  IF p_tipo='services' THEN SELECT * INTO existing FROM public.lc_orden_servicio WHERE id_orden=master.id_orden;
  ELSE SELECT * INTO existing FROM public.lc_orden_compra WHERE id_orden=master.id_orden; END IF;
  IF FOUND THEN
    IF existing.conceptos IS DISTINCT FROM p_conceptos OR existing.totales IS DISTINCT FROM p_totales THEN
      RAISE EXCEPTION 'La orden ya fue registrada con otro contenido';
    END IF;
    RETURN jsonb_build_object('id_orden',master.id_orden,'numero',existing.numero,'creado_en',existing.creado_en,'datos',master.datos,'conceptos',existing.conceptos,'totales',existing.totales);
  END IF;
  INSERT INTO public.lc_orden_correlativo(tipo,anio,ultimo) VALUES (p_tipo,year_number,10020)
    ON CONFLICT (tipo,anio) DO UPDATE SET ultimo=lc_orden_correlativo.ultimo+1
    RETURNING ultimo INTO serial_number;
  order_number := right(year_number::text,2)||'-'||lpad(serial_number::text,greatest(6,length(serial_number::text)), '0');
  IF p_tipo='services' THEN
    INSERT INTO public.lc_orden_servicio(id_orden,numero,conceptos,totales) VALUES (master.id_orden,order_number,p_conceptos,p_totales) RETURNING creado_en INTO saved_at;
  ELSE
    INSERT INTO public.lc_orden_compra(id_orden,numero,conceptos,totales) VALUES (master.id_orden,order_number,p_conceptos,p_totales) RETURNING creado_en INTO saved_at;
  END IF;
  RETURN jsonb_build_object('id_orden',master.id_orden,'numero',order_number,'creado_en',saved_at,'datos',master.datos,'conceptos',p_conceptos,'totales',p_totales);
END $function$;
REVOKE ALL ON FUNCTION public.lc_guardar_orden(bigint,bigint,bigint,uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lc_guardar_orden(bigint,bigint,bigint,uuid,text,jsonb,jsonb,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT 'Tablas y correlativos de ordenes listos' AS resultado;
