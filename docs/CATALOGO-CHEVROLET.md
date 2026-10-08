# Catálogo Chevrolet en Supabase

Fuente: `Copia de LISTA DE PRECIOS LUXCAR ELOY.xlsx`, hoja `Hoja1`.

121 opciones: Colorado WT (32), Silverado (22), N-400 (13), Groove (9), Tracker (9), Captiva (9), Traverse (6), Sail (9), Tahoe (6), Suburban (6). Se conservan los nombres y el orden del Excel; los precios se redondean a dos decimales.

## Cargar los datos

1. Abrir `backend/scripts/cargar-catalogo-chevrolet-supabase.sql`.
2. Copiar TODO el archivo en Supabase > SQL Editor y ejecutar.
3. El resultado muestra 10 modelos y un total de 121 opciones.
4. Publicar el backend y el frontend actualizados para mostrar el catálogo moderno y el cotizador.

No volver a ejecutar `retirar-catalogo-anterior-chevrolet.sql`: la importación completa ya retira de la vista las asociaciones anteriores.

El SQL reutiliza los modelos existentes por código (`CWT`, `SIL`, `N400`, etc.), usa el tipo `ACC`, crea los productos con códigos `CHEV-XLS-...` y sus asociaciones a Chevrolet en `lc_producto_cliente`. Agrega `moneda` y `orden` a esta tabla. Los productos nuevos usan el valor por defecto de `precio_real` definido en la base (0); el Excel no contiene costos internos y el SQL no los inventa ni sobrescribe los costos existentes.

La importación se ejecuta en un único bloque DO con sus 121 filas incluidas como datos JSON. No depende de tablas temporales ni de pasos anteriores. Es atómica: si una validación falla, no se confirma la importación. Puede ejecutarse nuevamente para actualizar los mismos códigos sin duplicarlos. Las asociaciones anteriores de productos y kits de Chevrolet se desactivan. No se borran productos, modelos, componentes, clientes ni mensajes globales, ni se modifican las asociaciones de Ford.

La moneda se carga como `USD` interpretando el encabezado `PRECIO $`. Esta interpretación sigue pendiente de confirmación del propietario. Si corresponde otra moneda, cambiar `v_moneda` en el SQL antes de ejecutarlo. Los importes no se convierten automáticamente. No se agregan impuestos o descuentos porque el archivo no los indica.

## Datos en producción

El backend lee las tablas existentes de Supabase (`lc_producto`, `lc_modelo`, `lc_tipo_producto`, `lc_producto_cliente`) después de validar el cliente activo. El JSON no se utiliza como fuente del catálogo en producción. Los cambios en los precios en Supabase se reflejan al recargar el catálogo.

`backend/data/chevrolet-catalog.json` y `sheet1.source.json` conservan los datos del Excel para auditoría y generación del SQL. `node backend/scripts/generate-chevrolet-sql.mjs` reconstruye el archivo de importación.

## Pruebas

`node --test backend/tests/chevrolet-catalog.test.js frontend/tests/quotation.test.mjs`

Las pruebas ejecutan el SQL completo en PostgreSQL local (PGlite) y verifican los 121 precios contra las celdas del Excel, la repetición de la importación, la conservación de Ford y de costos existentes, la lectura del backend desde la base, las cantidades y totales del cotizador, la moneda y la descarga PDF.

El SQL se entrega para ejecución manual. No se ha aplicado a la base de datos de Supabase desde esta sesión.