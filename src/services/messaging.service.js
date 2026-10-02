import { randomUUID } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { AppError } from '../middleware/errors.js';
import { assertDatabaseResult } from '../utils/database.js';

const BUCKET = 'mensajeria';
const SIGNED_URL_SECONDS = 600;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const STORAGE_LIMIT_BYTES = Number(process.env.MESSAGING_STORAGE_LIMIT_BYTES) || 1024 * 1024 * 1024;
const STORAGE_TRIGGER_PERCENT = Number(process.env.MESSAGING_STORAGE_TRIGGER_PERCENT) || 80;
const STORAGE_CLEANUP_PERCENT = Number(process.env.MESSAGING_STORAGE_CLEANUP_PERCENT) || 20;
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const ALLOWED_EXTENSIONS = new Map([
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])],
  ['application/pdf', new Set(['pdf'])],
  ['application/msword', new Set(['doc'])],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', new Set(['docx'])]
]);

function parseId(value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `${name} debe ser un entero positivo`, 'INVALID_PARAMETER');
  }
  return id;
}

function cleanText(value) {
  const text = String(value || '').trim();
  if (text.length > 4000) {
    throw new AppError(400, 'El mensaje no puede superar los 4000 caracteres', 'MESSAGE_TOO_LONG');
  }
  return text;
}

function safeFileName(name) {
  return String(name || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-120);
}

function validateFileMetadata(value) {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || value.nombre || '').trim();
  const mimeType = String(value.mimeType || value.tipo || '').trim().toLowerCase();
  const size = Number(value.size ?? value.tamanoBytes);
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!name || !ALLOWED_FILE_TYPES.has(mimeType) || !ALLOWED_EXTENSIONS.get(mimeType)?.has(extension)) {
    throw new AppError(415, 'Tipo de archivo no permitido', 'UNSUPPORTED_FILE_TYPE');
  }
  if (!Number.isInteger(size) || size <= 0) {
    throw new AppError(400, 'El tamaño del archivo no es válido', 'INVALID_FILE_SIZE');
  }
  if (size > MAX_FILE_SIZE) {
    throw new AppError(413, 'El archivo no puede superar los 20 MB', 'FILE_TOO_LARGE');
  }
  return { name, mimeType, size };
}

async function findConversationByClient(clientId) {
  const { data, error } = await supabase
    .from('lc_conversacion')
    .select('*')
    .eq('id_cliente', clientId)
    .maybeSingle();
  assertDatabaseResult(error, 'No fue posible consultar la conversación');
  return data;
}

async function createClientConversation(clientId) {
  const existing = await findConversationByClient(clientId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('lc_conversacion')
    .insert({ id_cliente: clientId })
    .select('*')
    .single();

  if (!error) return data;
  if (error.code === '23505') return findConversationByClient(clientId);
  assertDatabaseResult(error, 'No fue posible crear la conversación');
  return null;
}

async function requireConversationAccess(context, conversationId) {
  const id = parseId(conversationId, 'id_conversacion');
  const { data, error } = await supabase
    .from('lc_conversacion')
    .select('*')
    .eq('id_conversacion', id)
    .maybeSingle();
  assertDatabaseResult(error, 'No fue posible consultar la conversación');
  if (!data) throw new AppError(404, 'Conversación no encontrada', 'CONVERSATION_NOT_FOUND');
  if (context.role.codigo !== 'ADMIN' && Number(data.id_cliente) !== Number(context.client?.id)) {
    throw new AppError(403, 'No tienes acceso a esta conversación', 'CONVERSATION_ACCESS_DENIED');
  }
  return data;
}

async function createUploadAuthorization(conversation, fileValue) {
  const file = validateFileMetadata(fileValue);
  const path = `${conversation.id_conversacion}/pending/${randomUUID()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  assertDatabaseResult(error, 'No fue posible autorizar la carga del archivo');
  return {
    conversationId: conversation.id_conversacion,
    path,
    signedUrl: data.signedUrl,
    file: { name: file.name, mimeType: file.mimeType, size: file.size }
  };
}

async function verifyUploadedFile(conversation, fileValue) {
  const file = validateFileMetadata(fileValue);
  const path = String(fileValue.path || '').trim();
  const prefix = `${conversation.id_conversacion}/pending/`;
  if (!path.startsWith(prefix) || path.includes('..')) {
    throw new AppError(400, 'La ruta del archivo no es válida', 'INVALID_FILE_PATH');
  }

  const separator = path.lastIndexOf('/');
  const folder = path.slice(0, separator);
  const storedName = path.slice(separator + 1);
  const listed = await supabase.storage.from(BUCKET).list(folder, {
    limit: 2,
    search: storedName
  });
  assertDatabaseResult(listed.error, 'No fue posible verificar el archivo');
  const stored = (listed.data || []).find((item) => item.name === storedName);
  if (!stored) throw new AppError(400, 'El archivo todavía no fue cargado', 'FILE_NOT_UPLOADED');

  const storedSize = Number(stored.metadata?.size || file.size);
  const storedMimeType = String(stored.metadata?.mimetype || stored.metadata?.contentType || file.mimeType).toLowerCase();
  if (storedSize !== file.size || storedSize > MAX_FILE_SIZE || storedMimeType !== file.mimeType) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new AppError(400, 'El archivo cargado no coincide con la autorización', 'FILE_METADATA_MISMATCH');
  }

  const existing = await supabase
    .from('lc_mensaje_archivo')
    .select('id_mensaje_archivo')
    .eq('storage_path', path)
    .maybeSingle();
  assertDatabaseResult(existing.error, 'No fue posible verificar el registro del archivo');
  if (existing.data) throw new AppError(409, 'El archivo ya fue utilizado', 'FILE_ALREADY_USED');
  return { ...file, path };
}

async function cleanupMessagingStorage() {
  const triggerBytes = Math.floor(STORAGE_LIMIT_BYTES * STORAGE_TRIGGER_PERCENT / 100);
  const cleanupBytes = Math.floor(STORAGE_LIMIT_BYTES * STORAGE_CLEANUP_PERCENT / 100);
  const result = await supabase.from('lc_mensaje_archivo').select('*');
  assertDatabaseResult(result.error, 'No fue posible calcular el almacenamiento utilizado');
  const attachments = (result.data || []).sort((left, right) => {
    const leftDate = new Date(left.fecha_creacion || 0).getTime();
    const rightDate = new Date(right.fecha_creacion || 0).getTime();
    return leftDate - rightDate || Number(left.id_mensaje_archivo) - Number(right.id_mensaje_archivo);
  });
  const usedBytes = attachments.reduce((total, item) => total + Number(item.tamano_bytes || 0), 0);
  if (usedBytes < triggerBytes) return { cleaned: false, usedBytes, deletedBytes: 0 };

  const expired = [];
  let deletedBytes = 0;
  for (const attachment of attachments) {
    expired.push(attachment);
    deletedBytes += Number(attachment.tamano_bytes || 0);
    if (deletedBytes >= cleanupBytes) break;
  }
  if (!expired.length) return { cleaned: false, usedBytes, deletedBytes: 0 };

  for (let index = 0; index < expired.length; index += 100) {
    const paths = expired.slice(index, index + 100).map((item) => item.storage_path);
    const removed = await supabase.storage.from(BUCKET).remove(paths);
    assertDatabaseResult(removed.error, 'No fue posible eliminar los archivos antiguos');
  }

  const attachmentIds = expired.map((item) => item.id_mensaje_archivo);
  const messageIds = [...new Set(expired.map((item) => item.id_mensaje))];
  const messages = await supabase
    .from('lc_mensaje')
    .select('id_mensaje,contenido')
    .in('id_mensaje', messageIds);
  assertDatabaseResult(messages.error, 'No fue posible consultar los mensajes antiguos');

  const deleted = await supabase
    .from('lc_mensaje_archivo')
    .delete()
    .in('id_mensaje_archivo', attachmentIds);
  assertDatabaseResult(deleted.error, 'No fue posible eliminar los registros de archivos antiguos');

  await Promise.all((messages.data || []).map(async (message) => {
    const update = await supabase
      .from('lc_mensaje')
      .update({
        tipo: 'TEXTO',
        contenido: message.contenido || 'Archivo eliminado automáticamente por antigüedad.'
      })
      .eq('id_mensaje', message.id_mensaje);
    assertDatabaseResult(update.error, 'No fue posible actualizar el mensaje del archivo eliminado');
  }));

  return { cleaned: true, usedBytes, deletedBytes };
}

async function signedAttachment(row) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
  assertDatabaseResult(error, 'No fue posible generar el acceso al archivo');
  return {
    id: row.id_mensaje_archivo,
    kind: row.mime_type.startsWith('image/') ? 'image' : 'document',
    name: row.nombre_original,
    mimeType: row.mime_type,
    sizeBytes: Number(row.tamano_bytes),
    url: data.signedUrl
  };
}

async function loadMessages(context, conversationId) {
  const { data: messages, error } = await supabase
    .from('lc_mensaje')
    .select('*')
    .eq('id_conversacion', conversationId)
    .eq('eliminado', false)
    .order('fecha_creacion', { ascending: true });
  assertDatabaseResult(error, 'No fue posible consultar los mensajes');

  const messageIds = (messages || []).map((message) => message.id_mensaje);
  const userIds = [...new Set((messages || []).map((message) => message.id_usuario_remitente))];

  let attachments = [];
  if (messageIds.length) {
    const result = await supabase
      .from('lc_mensaje_archivo')
      .select('*')
      .in('id_mensaje', messageIds);
    assertDatabaseResult(result.error, 'No fue posible consultar los archivos');
    attachments = result.data || [];
  }

  let users = [];
  if (userIds.length) {
    const result = await supabase
      .from('lc_usuario')
      .select('id_usuario,username,nombre,apellido')
      .in('id_usuario', userIds);
    assertDatabaseResult(result.error, 'No fue posible consultar los remitentes');
    users = result.data || [];
  }

  const usersById = new Map(users.map((user) => [user.id_usuario, user]));
  const attachmentsByMessage = new Map();
  await Promise.all(attachments.map(async (attachment) => {
    const item = await signedAttachment(attachment);
    const current = attachmentsByMessage.get(attachment.id_mensaje) || [];
    current.push(item);
    attachmentsByMessage.set(attachment.id_mensaje, current);
  }));

  return (messages || []).map((message) => {
    const sender = usersById.get(message.id_usuario_remitente);
    return {
      id: message.id_mensaje,
      conversationId: message.id_conversacion,
      text: message.contenido || '',
      type: message.tipo,
      createdAt: message.fecha_creacion,
      own: Number(message.id_usuario_remitente) === Number(context.user.id),
      sender: {
        id: message.id_usuario_remitente,
        username: sender?.username || null,
        name: [sender?.nombre, sender?.apellido].filter(Boolean).join(' ') || sender?.username || 'Usuario'
      },
      attachments: attachmentsByMessage.get(message.id_mensaje) || []
    };
  });
}

async function markRead(context, conversationId, messages) {
  const lastIncoming = [...messages].reverse().find((message) => !message.own);
  if (!lastIncoming) return;
  const { error } = await supabase
    .from('lc_conversacion_lectura')
    .upsert({
      id_conversacion: conversationId,
      id_usuario: context.user.id,
      id_ultimo_mensaje_leido: lastIncoming.id,
      fecha_lectura: new Date().toISOString()
    }, { onConflict: 'id_conversacion,id_usuario' });
  assertDatabaseResult(error, 'No fue posible actualizar el estado de lectura');
}

async function conversationPayload(context, conversation, shouldMarkRead = true) {
  const messages = await loadMessages(context, conversation.id_conversacion);
  if (shouldMarkRead) await markRead(context, conversation.id_conversacion, messages);
  return {
    conversation: {
      id: conversation.id_conversacion,
      clientId: conversation.id_cliente,
      status: conversation.estado,
      lastMessageAt: conversation.fecha_ultimo_mensaje
    },
    messages
  };
}

async function insertMessage(context, conversation, textValue, fileValue) {
  const text = cleanText(textValue);
  const file = fileValue ? await verifyUploadedFile(conversation, fileValue) : null;
  if (!text && !file) {
    throw new AppError(400, 'Escribe un mensaje o adjunta un archivo', 'EMPTY_MESSAGE');
  }

  const type = text && file ? 'MIXTO' : file ? 'ARCHIVO' : 'TEXTO';
  const { data: message, error: messageError } = await supabase
    .from('lc_mensaje')
    .insert({
      id_conversacion: conversation.id_conversacion,
      id_usuario_remitente: context.user.id,
      contenido: text || null,
      tipo: type
    })
    .select('*')
    .single();
  assertDatabaseResult(messageError, 'No fue posible guardar el mensaje');

  try {
    if (file) {
      const metadata = await supabase
        .from('lc_mensaje_archivo')
        .insert({
          id_mensaje: message.id_mensaje,
          nombre_original: file.name,
          storage_path: file.path,
          mime_type: file.mimeType,
          tamano_bytes: file.size
        });
      assertDatabaseResult(metadata.error, 'No fue posible registrar el archivo');
    }
  } catch (error) {
    if (file?.path) await supabase.storage.from(BUCKET).remove([file.path]);
    await supabase.from('lc_mensaje').delete().eq('id_mensaje', message.id_mensaje);
    throw error;
  }

  if (file) {
    try {
      await cleanupMessagingStorage();
    } catch (error) {
      console.error('No fue posible ejecutar la limpieza de mensajería:', error.message);
    }
  }

  const messages = await loadMessages(context, conversation.id_conversacion);
  return messages.find((item) => Number(item.id) === Number(message.id_mensaje));
}

async function getClientRecord(clientId) {
  const { data, error } = await supabase
    .from('lc_cliente')
    .select('id_cliente,nombre,nombre_comercial,slug,logo_url,color_primario')
    .eq('id_cliente', clientId)
    .maybeSingle();
  assertDatabaseResult(error, 'No fue posible consultar el cliente');
  return data;
}

export async function getClientConversation(context) {
  const conversation = await findConversationByClient(context.client.id);
  if (!conversation) return { conversation: null, messages: [] };
  return conversationPayload(context, conversation);
}

export async function prepareClientFileUpload(context, file) {
  const conversation = await createClientConversation(context.client.id);
  return createUploadAuthorization(conversation, file);
}

export async function sendClientMessage(context, text, file) {
  const conversation = await createClientConversation(context.client.id);
  const message = await insertMessage(context, conversation, text, file);
  return {
    conversation: {
      id: conversation.id_conversacion,
      clientId: conversation.id_cliente,
      status: conversation.estado
    },
    message
  };
}

export async function listAdminConversations(context) {
  const { data: conversations, error } = await supabase
    .from('lc_conversacion')
    .select('*')
    .order('fecha_ultimo_mensaje', { ascending: false, nullsFirst: false });
  assertDatabaseResult(error, 'No fue posible consultar las conversaciones');
  if (!conversations?.length) return [];

  const conversationIds = conversations.map((item) => item.id_conversacion);
  const clientIds = conversations.map((item) => item.id_cliente);

  const [messagesResult, clientsResult, readsResult, linksResult] = await Promise.all([
    supabase
      .from('lc_mensaje')
      .select('id_mensaje,id_conversacion,id_usuario_remitente,contenido,tipo,fecha_creacion')
      .in('id_conversacion', conversationIds)
      .eq('eliminado', false)
      .order('fecha_creacion', { ascending: true }),
    supabase
      .from('lc_cliente')
      .select('id_cliente,nombre,nombre_comercial,slug,logo_url,color_primario')
      .in('id_cliente', clientIds),
    supabase
      .from('lc_conversacion_lectura')
      .select('*')
      .in('id_conversacion', conversationIds)
      .eq('id_usuario', context.user.id),
    supabase
      .from('lc_usuario_cliente')
      .select('id_cliente,id_usuario')
      .in('id_cliente', clientIds)
      .eq('activo', true)
  ]);
  assertDatabaseResult(messagesResult.error, 'No fue posible consultar los mensajes');
  assertDatabaseResult(clientsResult.error, 'No fue posible consultar los clientes');
  assertDatabaseResult(readsResult.error, 'No fue posible consultar los estados de lectura');
  assertDatabaseResult(linksResult.error, 'No fue posible consultar los contactos');

  const contactUserIds = [...new Set((linksResult.data || []).map((link) => link.id_usuario))];
  let contactUsers = [];
  if (contactUserIds.length) {
    const usersResult = await supabase
      .from('lc_usuario')
      .select('id_usuario,nombre,apellido,username')
      .in('id_usuario', contactUserIds);
    assertDatabaseResult(usersResult.error, 'No fue posible consultar los contactos');
    contactUsers = usersResult.data || [];
  }

  const clientsById = new Map((clientsResult.data || []).map((client) => [client.id_cliente, client]));
  const usersById = new Map(contactUsers.map((user) => [user.id_usuario, user]));
  const contactByClient = new Map();
  (linksResult.data || []).forEach((link) => {
    if (!contactByClient.has(link.id_cliente)) contactByClient.set(link.id_cliente, usersById.get(link.id_usuario));
  });
  const readByConversation = new Map((readsResult.data || []).map((read) => [read.id_conversacion, Number(read.id_ultimo_mensaje_leido || 0)]));
  const messagesByConversation = new Map();
  (messagesResult.data || []).forEach((message) => {
    const current = messagesByConversation.get(message.id_conversacion) || [];
    current.push(message);
    messagesByConversation.set(message.id_conversacion, current);
  });

  return conversations.flatMap((conversation) => {
    const messages = messagesByConversation.get(conversation.id_conversacion) || [];
    if (!messages.length) return [];
    const client = clientsById.get(conversation.id_cliente);
    const contact = contactByClient.get(conversation.id_cliente);
    const latest = messages[messages.length - 1];
    const lastRead = readByConversation.get(conversation.id_conversacion) || 0;
    const unread = messages.filter((message) => (
      Number(message.id_mensaje) > lastRead
      && Number(message.id_usuario_remitente) !== Number(context.user.id)
    )).length;
    const company = client?.nombre_comercial || client?.nombre || 'Cliente corporativo';
    const words = company.trim().split(/\s+/);
    const initials = words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
    return [{
      id: conversation.id_conversacion,
      company,
      slug: client?.slug || null,
      contact: [contact?.nombre, contact?.apellido].filter(Boolean).join(' ') || contact?.username || 'Contacto corporativo',
      initials,
      color: client?.color_primario || '#596675',
      logoUrl: client?.logo_url || null,
      unread,
      lastMessage: latest.contenido || 'Archivo adjunto',
      lastMessageAt: latest.fecha_creacion
    }];
  });
}

export async function getAdminConversation(context, conversationId) {
  const conversation = await requireConversationAccess(context, conversationId);
  const [payload, client] = await Promise.all([
    conversationPayload(context, conversation),
    getClientRecord(conversation.id_cliente)
  ]);
  return { ...payload, client };
}

export async function prepareAdminFileUpload(context, conversationId, file) {
  const conversation = await requireConversationAccess(context, conversationId);
  return createUploadAuthorization(conversation, file);
}

export async function sendAdminMessage(context, conversationId, text, file) {
  const conversation = await requireConversationAccess(context, conversationId);
  return insertMessage(context, conversation, text, file);
}
