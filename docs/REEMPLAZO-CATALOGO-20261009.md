# Reemplazo del catálogo Chevrolet

Fuente: `Copia de LISTA DE PRECIOS LUXCAR ELOY recontra ultimo.xlsx`, hoja `Hoja1`.

Ejecutar completo `scripts/cargar-catalogo-chevrolet-supabase.sql` en el proyecto Supabase del corporativo. No ejecutar antes una eliminación global de productos.

La importación es atómica y repetible. Reutiliza los modelos, actualiza los precios y retira las asociaciones anteriores de Chevrolet que no pertenecen al nuevo Excel. Conserva los productos y precios de Ford y bloquea cambios sobre códigos de importación compartidos con otro cliente. Los registros históricos no se eliminan físicamente.

| Modelo | Accesorios | Servicios | Total |
| --- | ---: | ---: | ---: |
| Colorado WT | 27 | 6 | 33 |
| Silverado | 17 | 6 | 23 |
| N-400 | 8 | 6 | 14 |
| Groove | 4 | 6 | 10 |
| Tracker | 4 | 6 | 10 |
| Captiva | 4 | 6 | 10 |
| Traverse | 1 | 6 | 7 |
| Sail | 4 | 6 | 10 |
| Tahoe | 1 | 6 | 7 |
| Suburban | 1 | 6 | 7 |
| **Total** | **71** | **60** | **131** |

Servicios: Tapizado de Asientos, Tapizado de Techo, Tapizado de Piso, Polarizado en Nanocerámico 3M, Undercoating y Tratamiento Cerámico. Los demás son accesorios.

Precios en USD, como en la importación anterior y el encabezado `PRECIO $`; redondeados a dos decimales. Las celdas `T22` (`1600`) y `T23` (`?`) no tienen nombre de producto ni precio asociado y se excluyen.

Después de ejecutar, la consulta final debe devolver diez modelos y los totales indicados. Recargar la página para renovar el catálogo guardado durante la sesión.
