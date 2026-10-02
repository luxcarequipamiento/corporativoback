import {
  getAdminConversation, getClientConversation, listAdminConversations,
  prepareAdminFileUpload, prepareClientFileUpload, sendAdminMessage, sendClientMessage
} from '../services/messaging.service.js';

export async function getClientMessages(request, response, next) {
  try {
    response.json({ ok: true, data: await getClientConversation(request.accessContext) });
  } catch (error) {
    next(error);
  }
}

export async function postClientMessage(request, response, next) {
  try {
    const data = await sendClientMessage(request.accessContext, request.body?.contenido, request.body?.archivo);
    response.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function prepareClientFile(request, response, next) {
  try {
    const data = await prepareClientFileUpload(request.accessContext, request.body);
    response.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAdminConversations(request, response, next) {
  try {
    response.json({ ok: true, data: await listAdminConversations(request.accessContext) });
  } catch (error) {
    next(error);
  }
}

export async function getAdminMessages(request, response, next) {
  try {
    const data = await getAdminConversation(request.accessContext, request.params.id);
    response.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postAdminMessage(request, response, next) {
  try {
    const data = await sendAdminMessage(
      request.accessContext,
      request.params.id,
      request.body?.contenido,
      request.body?.archivo
    );
    response.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function prepareAdminFile(request, response, next) {
  try {
    const data = await prepareAdminFileUpload(request.accessContext, request.params.id, request.body);
    response.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
