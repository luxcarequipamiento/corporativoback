-- CARGAR CATALOGO CHEVROLET EN SUPABASE
-- Fuente: Copia de LISTA DE PRECIOS LUXCAR ELOY recontra ultimo.xlsx | Hoja1 | 131 opciones / 10 modelos.
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
  v_accesorio public.lc_tipo_producto.id_tipo_producto%TYPE;
  v_servicio public.lc_tipo_producto.id_tipo_producto%TYPE;
  v_modelo public.lc_modelo.id_modelo%TYPE;
  v_producto public.lc_producto.id_producto%TYPE;
  v_moneda varchar(3) := 'USD';
  v_datos jsonb := '[
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-005",
    "nombre_producto": "Antivuelco de Metal Hammer",
    "precio_venta": 748.48,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-006",
    "nombre_producto": "Antivuelco Acerado Hammer",
    "precio_venta": 906.06,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-007",
    "nombre_producto": "Antivuelco con Parrilla Hammer",
    "precio_venta": 1142.42,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-008",
    "nombre_producto": "Antivuelco Z-Metal",
    "precio_venta": 374.24,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-009",
    "nombre_producto": "Antivuelvo Z-Acerado",
    "precio_venta": 433.33,
    "orden": 9,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-010",
    "nombre_producto": "Antivuelco Metralleta",
    "precio_venta": 1142.42,
    "orden": 10,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-011",
    "nombre_producto": "Antivuelvo Megalodon",
    "precio_venta": 1260.61,
    "orden": 11,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-012",
    "nombre_producto": "Aros Black Rhino",
    "precio_venta": 1812.12,
    "orden": 12,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-013",
    "nombre_producto": "Barras Traversales",
    "precio_venta": 216.67,
    "orden": 13,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-014",
    "nombre_producto": "Barra Led",
    "precio_venta": 472.73,
    "orden": 14,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-015",
    "nombre_producto": "Correlluvias",
    "precio_venta": 66.97,
    "orden": 15,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-016",
    "nombre_producto": "Defensa Delantera de Un Tubo",
    "precio_venta": 413.64,
    "orden": 16,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-017",
    "nombre_producto": "Defensa Delantera de Dos Tubos",
    "precio_venta": 512.12,
    "orden": 17,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-018",
    "nombre_producto": "Estribos de Acero",
    "precio_venta": 334.85,
    "orden": 18,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-019",
    "nombre_producto": "Estribos de Metal",
    "precio_venta": 531.82,
    "orden": 19,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-020",
    "nombre_producto": "Fenders Lisos",
    "precio_venta": 374.24,
    "orden": 20,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-021",
    "nombre_producto": "Fenders Empernados",
    "precio_venta": 433.33,
    "orden": 21,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-022",
    "nombre_producto": "Lona Marítima Keko",
    "precio_venta": 709.09,
    "orden": 22,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-023",
    "nombre_producto": "Llantas Mickey Thompson",
    "precio_venta": 1654.55,
    "orden": 23,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-024",
    "nombre_producto": "Moldura de Capot",
    "precio_venta": 275.76,
    "orden": 24,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-025",
    "nombre_producto": "Neblineros Forse de Dos Unidades",
    "precio_venta": 334.85,
    "orden": 25,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-026",
    "nombre_producto": "Neblineros Forse de Cuatro Unidades",
    "precio_venta": 630.3,
    "orden": 26,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-027",
    "nombre_producto": "Portaneblineros",
    "precio_venta": 334.85,
    "orden": 27,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-028",
    "nombre_producto": "Protector de Tolva",
    "precio_venta": 492.42,
    "orden": 28,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-029",
    "nombre_producto": "Parrilla de Techo Off Road",
    "precio_venta": 709.09,
    "orden": 29,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-030",
    "nombre_producto": "Tapa Retráctil Manual",
    "precio_venta": 1378.79,
    "orden": 30,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-031",
    "nombre_producto": "Tapa Retráctil Eléctrica",
    "precio_venta": 1693.94,
    "orden": 31,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-032",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 354.55,
    "orden": 32,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-033",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 196.97,
    "orden": 33,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-034",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 177.27,
    "orden": 34,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-035",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 374.24,
    "orden": 35,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-036",
    "nombre_producto": "Undercoating",
    "precio_venta": 512.12,
    "orden": 36,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CWT",
    "nombre_modelo": "COLORADO WT",
    "codigo_producto": "CHEV-XLS-CWT-037",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 720,
    "orden": 37,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-005",
    "nombre_producto": "Antivuelco de Metal Hammer",
    "precio_venta": 748.48,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-006",
    "nombre_producto": "Antivuelco Acerado Hammer",
    "precio_venta": 906.06,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-007",
    "nombre_producto": "Antivuelco con Parrilla Hammer",
    "precio_venta": 1142.42,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-008",
    "nombre_producto": "Antivuelco Metralleta",
    "precio_venta": 1142.42,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-009",
    "nombre_producto": "Antivuelvo Megalodon",
    "precio_venta": 1260.61,
    "orden": 9,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-010",
    "nombre_producto": "Aros Black Rhino",
    "precio_venta": 1693.94,
    "orden": 10,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-011",
    "nombre_producto": "Barra Led",
    "precio_venta": 472.73,
    "orden": 11,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-012",
    "nombre_producto": "Correlluvias",
    "precio_venta": 137.88,
    "orden": 12,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-013",
    "nombre_producto": "Estribos de Metal",
    "precio_venta": 748.48,
    "orden": 13,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-014",
    "nombre_producto": "Fenders Lisos",
    "precio_venta": 669.7,
    "orden": 14,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-015",
    "nombre_producto": "Llantas Mickey Thompson",
    "precio_venta": 2324.24,
    "orden": 15,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-016",
    "nombre_producto": "Neblineros Forse de Dos Unidades",
    "precio_venta": 334.85,
    "orden": 16,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-017",
    "nombre_producto": "Neblineros Forse de Cuatro Unidades",
    "precio_venta": 630.3,
    "orden": 17,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-018",
    "nombre_producto": "Parrilla de Techo Off Road",
    "precio_venta": 945.45,
    "orden": 18,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-019",
    "nombre_producto": "Portaneblineros",
    "precio_venta": 334.85,
    "orden": 19,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-020",
    "nombre_producto": "Tapa Retráctil Manual",
    "precio_venta": 1693.94,
    "orden": 20,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-021",
    "nombre_producto": "Tapa Retráctil Eléctrica",
    "precio_venta": 2206.06,
    "orden": 21,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-022",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 433.33,
    "orden": 22,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-023",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 256.06,
    "orden": 23,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-024",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 256.06,
    "orden": 24,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-025",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 472.73,
    "orden": 25,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-026",
    "nombre_producto": "Undercoating",
    "precio_venta": 630.3,
    "orden": 26,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SIL",
    "nombre_modelo": "SILVERADO",
    "codigo_producto": "CHEV-XLS-SIL-027",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 850,
    "orden": 27,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 137.88,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-006",
    "nombre_producto": "Defensa Delantera de Un Tubo",
    "precio_venta": 413.64,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-007",
    "nombre_producto": "Defensa Delantera de Dos Tubos",
    "precio_venta": 512.12,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-008",
    "nombre_producto": "Escalera de Acero",
    "precio_venta": 374.24,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-009",
    "nombre_producto": "Estribos de Acero",
    "precio_venta": 334.85,
    "orden": 9,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-010",
    "nombre_producto": "Neblineros Forse de Dos Unidades",
    "precio_venta": 334.85,
    "orden": 10,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-011",
    "nombre_producto": "Neblineros Forse de Cuatro Unidades",
    "precio_venta": 630.3,
    "orden": 11,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-012",
    "nombre_producto": "Parrilla de Techo Off Road",
    "precio_venta": 787.88,
    "orden": 12,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-013",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 433.33,
    "orden": 13,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-014",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 256.06,
    "orden": 14,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-015",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 256.06,
    "orden": 15,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-016",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 472.73,
    "orden": 16,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-017",
    "nombre_producto": "Undercoating",
    "precio_venta": 590.91,
    "orden": 17,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "N400",
    "nombre_modelo": "N-400",
    "codigo_producto": "CHEV-XLS-N400-018",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 850,
    "orden": 18,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 66.97,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-006",
    "nombre_producto": "Portaequipaje de 450 LT",
    "precio_venta": 472.73,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-007",
    "nombre_producto": "Portaequipaje de 500 LT",
    "precio_venta": 590.91,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-008",
    "nombre_producto": "Portaequipaje de 600 LT",
    "precio_venta": 709.09,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-009",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 354.55,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-010",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 196.97,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-011",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 177.27,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-012",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 374.24,
    "orden": 12,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-013",
    "nombre_producto": "Undercoating",
    "precio_venta": 512.12,
    "orden": 13,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "GRO",
    "nombre_modelo": "GROOVE",
    "codigo_producto": "CHEV-XLS-GRO-014",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 650,
    "orden": 14,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 66.97,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-006",
    "nombre_producto": "Portaequipaje de 450 LT",
    "precio_venta": 472.73,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-007",
    "nombre_producto": "Portaequipaje de 500 LT",
    "precio_venta": 590.91,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-008",
    "nombre_producto": "Portaequipaje de 600 LT",
    "precio_venta": 709.09,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-009",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 354.55,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-010",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 196.97,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-011",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 177.27,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-012",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 374.24,
    "orden": 12,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-013",
    "nombre_producto": "Undercoating",
    "precio_venta": 512.12,
    "orden": 13,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRA",
    "nombre_modelo": "TRACKER",
    "codigo_producto": "CHEV-XLS-TRA-014",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 650,
    "orden": 14,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 66.97,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-006",
    "nombre_producto": "Portaequipaje de 450 LT",
    "precio_venta": 472.73,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-007",
    "nombre_producto": "Portaequipaje de 500 LT",
    "precio_venta": 590.91,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-008",
    "nombre_producto": "Portaequipaje de 600 LT",
    "precio_venta": 709.09,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-009",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 354.55,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-010",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 196.97,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-011",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 177.27,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-012",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 374.24,
    "orden": 12,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-013",
    "nombre_producto": "Undercoating",
    "precio_venta": 512.12,
    "orden": 13,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "CAP",
    "nombre_modelo": "CAPTIVA",
    "codigo_producto": "CHEV-XLS-CAP-014",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 650,
    "orden": 14,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 137.88,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-006",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 709.09,
    "orden": 6,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-007",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 275.76,
    "orden": 7,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-008",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 256.06,
    "orden": 8,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-009",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 590.91,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-010",
    "nombre_producto": "Undercoating",
    "precio_venta": 709.09,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TRV",
    "nombre_modelo": "TRAVERSE",
    "codigo_producto": "CHEV-XLS-TRV-011",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 990,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 66.97,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-006",
    "nombre_producto": "Portaequipaje de 450 LT",
    "precio_venta": 472.73,
    "orden": 6,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-007",
    "nombre_producto": "Portaequipaje de 500 LT",
    "precio_venta": 590.91,
    "orden": 7,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-008",
    "nombre_producto": "Portaequipaje de 600 LT",
    "precio_venta": 709.09,
    "orden": 8,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-009",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 354.55,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-010",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 196.97,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-011",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 177.27,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-012",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 374.24,
    "orden": 12,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-013",
    "nombre_producto": "Undercoating",
    "precio_venta": 512.12,
    "orden": 13,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SAI",
    "nombre_modelo": "SAIL",
    "codigo_producto": "CHEV-XLS-SAI-014",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 650,
    "orden": 14,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 137.88,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-006",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 709.09,
    "orden": 6,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-007",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 334.85,
    "orden": 7,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-008",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 256.06,
    "orden": 8,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-009",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 590.91,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-010",
    "nombre_producto": "Undercoating",
    "precio_venta": 709.09,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "TAH",
    "nombre_modelo": "TAHOE",
    "codigo_producto": "CHEV-XLS-TAH-011",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 990,
    "orden": 11,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-005",
    "nombre_producto": "Correlluvias",
    "precio_venta": 137.88,
    "orden": 5,
    "tipo_codigo": "ACC"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-006",
    "nombre_producto": "Tapizado de Asientos",
    "precio_venta": 709.09,
    "orden": 6,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-007",
    "nombre_producto": "Tapizado de Techo",
    "precio_venta": 433.33,
    "orden": 7,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-008",
    "nombre_producto": "Tapizado de Piso",
    "precio_venta": 315.15,
    "orden": 8,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-009",
    "nombre_producto": "Polarizado en Nanocerámico 3M",
    "precio_venta": 709.09,
    "orden": 9,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-010",
    "nombre_producto": "Undercoating",
    "precio_venta": 709.09,
    "orden": 10,
    "tipo_codigo": "SER"
  },
  {
    "codigo_modelo": "SUB",
    "nombre_modelo": "SUBURBAN",
    "codigo_producto": "CHEV-XLS-SUB-011",
    "nombre_producto": "Tratamiento Cerámico",
    "precio_venta": 990,
    "orden": 11,
    "tipo_codigo": "SER"
  }
]'::jsonb;
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

  v_accesorio := v_tipo;
  IF NOT EXISTS (SELECT 1 FROM public.lc_tipo_producto WHERE codigo='SER') THEN
    INSERT INTO public.lc_tipo_producto (codigo,nombre,activo) VALUES ('SER','Servicios',true);
  END IF;
  SELECT id_tipo_producto INTO STRICT v_servicio FROM public.lc_tipo_producto WHERE codigo='SER';
  IF NOT EXISTS (SELECT 1 FROM public.lc_tipo_producto WHERE id_tipo_producto=v_servicio AND activo IS DISTINCT FROM false) THEN
    RAISE EXCEPTION 'El tipo SER esta inactivo; activar antes de importar';
  END IF;

  -- Solo modifica los productos exclusivos de esta importacion.
  IF EXISTS (
    SELECT 1 FROM public.lc_producto p
    JOIN jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer) ON i.codigo_producto=p.codigo
    JOIN public.lc_producto_cliente pc ON pc.id_producto=p.id_producto
    WHERE pc.id_cliente<>v_cliente
  ) THEN RAISE EXCEPTION 'Un codigo CHEV-XLS esta vinculado a otro cliente; no se modifico nada'; END IF;

  FOR v_row IN SELECT * FROM jsonb_to_recordset(v_datos) AS i(codigo_modelo text,nombre_modelo text,codigo_producto text,nombre_producto text,precio_venta numeric,orden integer,tipo_codigo text) ORDER BY codigo_modelo,orden LOOP
    v_tipo := CASE WHEN v_row.tipo_codigo='SER' THEN v_servicio ELSE v_accesorio END;
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
  IF v_total<>131 THEN RAISE EXCEPTION 'Se esperaban 131 opciones; se obtuvieron %',v_total; END IF;
END
$import$;

-- Resultado esperado: 10 filas, con un total de 131 opciones.
SELECT m.nombre_modelo AS modelo,count(*) AS opciones,
  count(*) FILTER (WHERE t.codigo='ACC') AS accesorios,
  count(*) FILTER (WHERE t.codigo='SER') AS servicios,min(pc.moneda) AS moneda
FROM public.lc_producto_cliente pc
JOIN public.lc_cliente c ON c.id_cliente=pc.id_cliente
JOIN public.lc_producto p ON p.id_producto=pc.id_producto
JOIN public.lc_tipo_producto t ON t.id_tipo_producto=p.id_tipo_producto
JOIN public.lc_modelo m ON m.id_modelo=p.id_modelo
WHERE c.slug='chevrolet' AND pc.activo IS DISTINCT FROM false AND p.activo IS DISTINCT FROM false
GROUP BY m.nombre_modelo ORDER BY m.nombre_modelo;

