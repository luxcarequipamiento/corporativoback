# API REST Lux Car

Base local: `http://localhost:3001/api`

## Autenticacion en Postman

1. Ejecutar `POST /auth/login` con body JSON:

```json
{
  "email": "empresaford@luxcarequipamiento.pe",
  "password": "CONTRASENA_DEL_USUARIO"
}
```

2. Copiar `session.access_token` de la respuesta.
3. En las peticiones protegidas usar Authorization > Bearer Token.

El login y la renovacion son operaciones preexistentes necesarias para Supabase Auth. Los recursos de datos implementados en esta fase son solo GET.

## Sesion y salud

| Metodo | Ruta | JWT | Acceso | Respuesta |
|---|---|---:|---|---|
| GET | `/health` | No | Publico | Estado del backend |
| GET | `/health/database` | No | Publico | Estado de conexion Supabase |
| GET | `/auth/me` | Si | CLIENTE/ADMIN | Usuario, aplicacion, rol y cliente derivado del JWT |

## Consultas administrativas

Todos estos endpoints requieren JWT con rol `ADMIN`. Cada recurso admite listado y detalle `/:id`.

| Rutas base | Relaciones o contenido |
|---|---|
| `/tipos-cliente` | `lc_tipo_cliente` |
| `/clientes` | `lc_cliente -> lc_tipo_cliente` |
| `/usuarios` | `lc_usuario -> lc_usuario_cliente -> lc_cliente` y `lc_usuario -> lc_usuario_aplicacion -> lc_aplicacion/lc_rol` |
| `/aplicaciones` | `lc_aplicacion` |
| `/roles` | `lc_rol` |
| `/tipos-producto` | `lc_tipo_producto` |
| `/productos` | `lc_producto -> lc_tipo_producto -> lc_producto_cliente -> lc_cliente` |
| `/kits` | `lc_kit -> lc_kit_producto -> lc_producto -> lc_tipo_producto`, más asignaciones a clientes |
| `/usuarios-clientes` | `lc_usuario_cliente` |
| `/usuarios-aplicaciones` | `lc_usuario_aplicacion` |
| `/productos-clientes` | `lc_producto_cliente` |
| `/kits-productos` | `lc_kit_producto` |
| `/kits-clientes` | `lc_kit_cliente` |

Los endpoints administrativos de productos y kits incluyen `precio_real`. Nunca deben consumirse desde el portal corporativo.

## Consultas por cliente

Requieren JWT. Un `CLIENTE` solo puede consultar su propio `idCliente` o `slug`; `ADMIN` puede consultar cualquier cliente.

| Metodo | Ruta | Respuesta |
|---|---|---|
| GET | `/clientes/:idCliente/productos` | Productos activos y `precio_venta` |
| GET | `/clientes/:idCliente/accesorios` | Productos activos tipo `ACC` |
| GET | `/clientes/:idCliente/servicios` | Productos activos tipo `SER` |
| GET | `/clientes/:idCliente/kits` | Kits activos, `precio_venta` y componentes |
| GET | `/clientes/:idCliente/kits/:idKit` | Detalle de un kit autorizado |
| GET | `/clientes/slug/:slug` | Perfil seguro del cliente |
| GET | `/clientes/slug/:slug/productos` | Productos del cliente identificado por slug |
| GET | `/clientes/slug/:slug/accesorios` | Accesorios del cliente identificado por slug |
| GET | `/clientes/slug/:slug/servicios` | Servicios del cliente identificado por slug |
| GET | `/clientes/slug/:slug/kits` | Kits del cliente identificado por slug |
| GET | `/clientes/slug/:slug/kits/:idKit` | Kit autorizado identificado por slug |

El `slug` identifica el recurso, pero no autoriza. La autorizacion siempre se deriva del JWT y `lc_usuario_cliente`.

## Portal corporativo

Requieren JWT con rol `CLIENTE`. No reciben cliente, id ni slug para decidir el acceso.

| Metodo | Ruta | Respuesta |
|---|---|---|
| GET | `/corporativo/me` | Perfil, cliente, aplicacion y rol |
| GET | `/corporativo/productos` | Productos activos del cliente autenticado |
| GET | `/corporativo/accesorios` | Accesorios `ACC` del cliente autenticado |
| GET | `/corporativo/servicios` | Servicios `SER` del cliente autenticado |
| GET | `/corporativo/kits` | Kits activos y componentes autorizados |
| GET | `/corporativo/kits/:id` | Kit autorizado del cliente autenticado |
| GET | `/catalogo` | Respuesta agregada compatible con el frontend actual |

Ninguna respuesta corporativa contiene `precio_real`.

## Rutas corporativas por slug

Estas son las rutas principales consumidas por el frontend. Requieren JWT con rol `CLIENTE`:

| Metodo | Ruta | Ejemplo |
|---|---|---|
| GET | `/:slug/kits` | `/ford/kits` |
| GET | `/:slug/servicios` | `/ford/servicios` |
| GET | `/:slug/accesorios` | `/ford/accesorios` |

Las rutas completas incluyen la base `/api`, por ejemplo `GET http://localhost:3001/api/ford/kits`.

El slug se obtiene de `lc_cliente.slug` durante el login. Antes de cada consulta, el backend compara el slug solicitado con el cliente resuelto mediante `JWT -> lc_usuario -> lc_usuario_cliente -> lc_cliente`. Una diferencia devuelve `403 CLIENT_ACCESS_DENIED`.

## Estados HTTP

- `200`: consulta correcta.
- `400`: parametro invalido.
- `401`: JWT ausente, invalido o vencido.
- `403`: rol o cliente no autorizado.
- `404`: recurso inexistente o no disponible para el cliente.
- `500`: error interno o de Supabase, sin stack ni secretos en la respuesta.
