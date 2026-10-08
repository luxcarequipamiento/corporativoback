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

## Chats individuales por usuario

Antes de desplegar el backend actualizado, ejecutar en Supabase SQL Editor el archivo `migrations/20261005_mensajeria_por_usuario.sql`. Luego desplegar backend y frontend juntos. La migracion agrega `lc_conversacion.id_usuario`, reemplaza la unicidad por cliente por `(id_cliente, id_usuario)` y restringe el acceso directo a conversaciones, mensajes y archivos.

Cada usuario autenticado consulta y envia mensajes solo en su propia conversacion, aunque otros usuarios pertenezcan al mismo cliente. El administrador ve una conversacion por persona. Los historiales anteriores se recuperan solo si su propietario es inequivoco; los demas conservan sus mensajes y quedan disponibles solo para administradores.

Verificacion local: `node --test tests/messaging-isolation.test.js`. Tras aplicar el SQL y desplegar, iniciar sesion con dos usuarios del mismo cliente, enviar un mensaje desde cada uno y comprobar que cada cuenta ve solo su chat y que el administrador ve ambas conversaciones por separado.

## Cat�logo Chevrolet del Excel

Importaci�n directa a Supabase: ejecutar el SQL completo de scripts/cargar-catalogo-chevrolet-supabase.sql. Agrega los 121 conceptos y sus precios por modelo en las tablas existentes. El backend actualizado consulta estos datos desde Supabase. Instrucciones y pruebas: [docs/CATALOGO-CHEVROLET.md](docs/CATALOGO-CHEVROLET.md).
