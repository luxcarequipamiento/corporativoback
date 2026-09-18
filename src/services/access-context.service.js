import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/errors.js';
import { assertDatabaseResult, isActive } from '../utils/database.js';

async function findOne(table, column, value) {
  const { data, error } = await supabase.from(table).select('*').eq(column, value);
  assertDatabaseResult(error);
  return (data || []).find(isActive) || null;
}

export async function resolveAccessContext(authUser) {
  const user = await findOne('lc_usuario', 'id_auth', authUser.id);
  if (!user) throw new AppError(403, 'Usuario sin perfil activo', 'PROFILE_NOT_FOUND');

  const application = await findOne('lc_aplicacion', 'codigo', 'CORPORATIVO');
  if (!application) throw new AppError(403, 'Aplicacion corporativa no disponible', 'APPLICATION_DISABLED');

  const { data: accessRows, error: accessError } = await supabase
    .from('lc_usuario_aplicacion')
    .select('*')
    .eq('id_usuario', user.id_usuario)
    .eq('id_aplicacion', application.id_aplicacion);
  assertDatabaseResult(accessError);
  const applicationAccess = (accessRows || []).find(isActive);
  if (!applicationAccess) throw new AppError(403, 'Usuario sin acceso al portal corporativo', 'APPLICATION_ACCESS_DENIED');

  const role = await findOne('lc_rol', 'id_rol', applicationAccess.id_rol);
  if (!role || !['CLIENTE', 'ADMIN'].includes(role.codigo)) {
    throw new AppError(403, 'Rol sin permisos para esta aplicacion', 'ROLE_ACCESS_DENIED');
  }

  const { data: links, error: linksError } = await supabase
    .from('lc_usuario_cliente')
    .select('*')
    .eq('id_usuario', user.id_usuario);
  assertDatabaseResult(linksError);
  const activeLinks = (links || []).filter(isActive);

  let client = null;
  if (role.codigo === 'CLIENTE') {
    if (activeLinks.length !== 1) {
      throw new AppError(403, 'El usuario cliente debe tener un unico cliente activo', 'INVALID_CLIENT_ACCESS');
    }
    client = await findOne('lc_cliente', 'id_cliente', activeLinks[0].id_cliente);
    if (!client) throw new AppError(403, 'Cliente inactivo o inexistente', 'CLIENT_NOT_FOUND');
  }

  return {
    authUser: { id: authUser.id, email: authUser.email },
    user: {
      id: user.id_usuario,
      username: user.username,
      nombre: [user.nombre, user.apellido].filter(Boolean).join(' '),
      correo: user.correo
    },
    application: { id: application.id_aplicacion, codigo: application.codigo },
    role: { id: role.id_rol, codigo: role.codigo },
    client: client ? {
      id: client.id_cliente,
      id_cliente: client.id_cliente,
      codigo: client.codigo,
      slug: client.slug,
      nombre: client.nombre
    } : null
  };
}
