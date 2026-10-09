# Órdenes de compra y servicio

Ejecutar completo `migrations/20261009_ordenes_compra_servicio.sql` en Supabase antes de utilizar las nuevas descargas. Puede ejecutarse nuevamente sin reiniciar correlativos ni borrar registros.

- `lc_orden_maestra`: une los documentos de una cotización y los relaciona mediante claves foráneas con cliente, usuario y modelo. `datos` conserva vehículo, VIN, observación y nombre del asesor en el momento del registro.
- `lc_orden_compra`: accesorios y kits, precios y totales guardados como instantánea.
- `lc_orden_servicio`: servicios, precios y totales guardados como instantánea.
- `lc_orden_correlativo`: contador independiente por tipo y año. En 2026 empieza en `26-010020`; en 2027 empieza en `27-010020`.

`POST /api/ordenes` usa la sesión autenticada para determinar cliente y asesor; valida productos, modelo, cantidades y precios contra el catálogo. No acepta un cliente o asesor elegido desde el navegador. Las tablas y la función solo permiten acceso directo al backend con `service_role`.

La función registra y asigna el correlativo en una sola transacción. Dos solicitudes concurrentes comparten el bloqueo de su contador y no obtienen el mismo número dentro del mismo tipo. Compra y servicio pueden compartir el texto del número porque tienen numeraciones independientes.

Una cotización puede generar ambos documentos vinculados a la misma orden maestra. El navegador reutiliza la solicitud y la instantánea guardada al volver a descargar; el backend también reutiliza el registro ante reintentos. Modificar los conceptos, cantidades o datos genera una nueva solicitud. Vaciar todo inicia una cotización nueva.

Las instantáneas mantienen los precios y textos registrados aunque el catálogo cambie después. El PDF usa el número y fecha del registro, no un correlativo calculado en el navegador. Las observaciones y datos del vehículo siguen siendo opcionales y sus avisos no bloquean el registro.

La interfaz actual permite repetir descargas durante la cotización abierta. No incorpora una pantalla de historial ni restaura cotizaciones al recargar el navegador.
