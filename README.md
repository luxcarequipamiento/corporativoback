# Lux Car Backend

Backend privado para la plataforma corporativa, preparado para Express y Supabase.

## Configuración

1. Copia `.env.example` como `.env`.
2. Completa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecuta `npm install` dentro de `backend`.
4. Inicia el servidor con `npm run dev`.

Para varios dominios frontend, configura `FRONTEND_URLS` como una lista separada por comas y sin `/` final.

## Rutas iniciales

- `GET /api/health`: comprueba que el servidor responde.
- `GET /api/health/database`: comprueba las credenciales de Supabase.
- `POST /api/auth/login`: inicia sesión con correo y contraseña de Supabase Auth.
- `POST /api/auth/refresh`: renueva una sesión.
- `GET /api/auth/me`: devuelve rol y cliente derivados del usuario autenticado.
- `GET /api/catalogo`: devuelve productos y kits autorizados para el cliente autenticado.
- `GET /api/modelos`: devuelve los modelos de vehículo (requiere rol `ADMIN`).
- `GET /api/servicios-paquetes`: devuelve paquetes de servicios con modelo y productos (requiere rol `ADMIN`).
- `GET /api/:slug/kits`: kits y precios del cliente autenticado.
- `GET /api/:slug/servicios`: servicios y precios del cliente autenticado.
- `GET /api/:slug/accesorios`: accesorios y precios del cliente autenticado.

Las rutas protegidas requieren `Authorization: Bearer <access_token>`. El cliente nunca se recibe por URL ni por el cuerpo de la solicitud.

La clave `SUPABASE_SERVICE_ROLE_KEY` nunca debe enviarse al navegador ni guardarse en el repositorio.

La referencia completa de endpoints, relaciones, permisos y pruebas con Postman se encuentra en [`docs/API.md`](docs/API.md).
