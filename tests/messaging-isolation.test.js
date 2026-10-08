import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AppError } from '../src/middleware/errors.js';
import { assertDatabaseResult } from '../src/utils/database.js';

// In-memory Supabase adapter; execute the real service without network or credentials.
function fixture() {
  const tables = {
    lc_conversacion: [
      {id_conversacion: 1, id_cliente: 10, id_usuario: 101, estado: 'ABIERTA'},
      {id_conversacion: 2, id_cliente: 10, id_usuario: 102, estado: 'ABIERTA'},
      {id_conversacion: 3, id_cliente: 10, id_usuario: null, estado: 'ABIERTA'}
    ],
    lc_usuario: [{id_usuario:101, nombre:'Juan'}, {id_usuario:102, nombre:'Maria'}, {id_usuario:999, nombre:'Admin'}],
    lc_cliente: [{id_cliente:10, nombre:'Chevrolet', slug:'chevrolet'}],
    lc_mensaje: [
      {id_mensaje:1, id_conversacion:1, id_usuario_remitente:101, contenido:'Privado Juan', eliminado:false},
      {id_mensaje:2, id_conversacion:2, id_usuario_remitente:102, contenido:'Privado Maria', eliminado:false},
      {id_mensaje:3, id_conversacion:3, id_usuario_remitente:999, contenido:'Historial anterior', eliminado:false}
    ],
    lc_mensaje_archivo: [], lc_conversacion_lectura: []
  };
  let raceNextInsert = false;
  class Query {
    constructor(table) { this.table = table; this.filters = []; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    order() { return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    insert(row) { this.newRow = row; return this; }
    upsert(row) { this.upsertRow = row; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (this.newRow) {
          const idKey = this.table === 'lc_conversacion' ? 'id_conversacion' : 'id_mensaje';
          const row = {...this.newRow, [idKey]: tables[this.table].length + 1, eliminado:false, estado:'ABIERTA'};
          tables[this.table].push(row);
          if (this.table === 'lc_conversacion' && raceNextInsert) {
            raceNextInsert = false;
            return {data:null, error:{code:'23505'}};
          }
          return {data:this.one ? row : [row], error:null};
        }
        if (this.upsertRow) tables[this.table].push(this.upsertRow);
        const rows = tables[this.table].filter(row => this.filters.every(filter => filter(row)));
        return {data:this.one ? rows[0] || null : rows, error:null};
      }).then(resolve, reject);
    }
  }
  const supabase = {from: table => new Query(table), storage:{from: () => ({createSignedUploadUrl: async path => ({data:{signedUrl:path}, error:null})})}};
  const source = readFileSync(new URL('../src/services/messaging.service.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace(/export async function /g, 'async function ');
  const service = new Function('supabase', 'AppError', 'assertDatabaseResult', 'randomUUID', source + '\nreturn {getClientConversation, sendClientMessage, listAdminConversations, requireConversationAccess, prepareClientFileUpload, verifyUploadedFile};')(supabase, AppError, assertDatabaseResult, () => 'test');
  return {tables, service, race: () => {raceNextInsert = true;}};
}
const context = id => ({user:{id}, client:{id:10}, role:{codigo:'CLIENTE'}});

test('two users of the same client read separate chats and messages', async () => {
  const {service} = fixture();
  const juan = await service.getClientConversation(context(101));
  const maria = await service.getClientConversation(context(102));
  assert.equal(juan.conversation.id, 1);
  assert.equal(maria.conversation.id, 2);
  assert.deepEqual(juan.messages.map(m => m.text), ['Privado Juan']);
  assert.deepEqual(maria.messages.map(m => m.text), ['Privado Maria']);
  assert.deepEqual(await service.getClientConversation(context(103)), {conversation:null, messages:[]});
});

test('sending creates one personal thread and reuses it on the next send', async () => {
  const {service, tables} = fixture();
  const first = await service.sendClientMessage(context(103), 'Nuevo chat');
  const second = await service.sendClientMessage(context(103), 'Segundo mensaje');
  assert.equal(first.conversation.userId, 103);
  assert.equal(first.conversation.id, second.conversation.id);
  assert.equal(tables.lc_conversacion.filter(c => c.id_usuario === 103).length, 1);
  assert.deepEqual((await service.getClientConversation(context(101))).messages.map(m => m.text), ['Privado Juan']);
});

test('a concurrent creation conflict reuses the same personal thread', async () => {
  const {service, race} = fixture();
  race();
  const result = await service.sendClientMessage(context(103), 'Mensaje concurrente');
  assert.equal(result.conversation.userId, 103);
});

test('users cannot access another user or archived shared thread; admin can', async () => {
  const {service} = fixture();
  await assert.rejects(service.requireConversationAccess(context(101), 2), {status:403, code:'CONVERSATION_ACCESS_DENIED'});
  await assert.rejects(service.requireConversationAccess(context(101), 3), {status:403});
  await assert.rejects(service.requireConversationAccess({...context(101), client:{id:20}}, 1), {status:403});
  const admin = {...context(999), role:{codigo:'ADMIN'}};
  assert.equal((await service.requireConversationAccess(admin, 2)).id_conversacion, 2);
  assert.equal((await service.requireConversationAccess(admin, 3)).id_conversacion, 3);
});

test('admin sees the correct contact for each thread of the same client', async () => {
  const {service} = fixture();
  const list = await service.listAdminConversations({...context(999), role:{codigo:'ADMIN'}});
  assert.equal(list.find(c => c.id === 1).contact, 'Juan');
  assert.equal(list.find(c => c.id === 2).contact, 'Maria');
  assert.equal(list.find(c => c.id === 3).contact, 'Historial compartido anterior');
});

test('uploads are scoped to personal threads and another thread file is rejected', async () => {
  const {service} = fixture();
  const file = {name:'photo.jpg', mimeType:'image/jpeg', size:100};
  const juan = await service.prepareClientFileUpload(context(101), file);
  const maria = await service.prepareClientFileUpload(context(102), file);
  assert.ok(juan.path.startsWith('1/pending/'));
  assert.ok(maria.path.startsWith('2/pending/'));
  await assert.rejects(service.verifyUploadedFile({id_conversacion:2}, {...file, path:juan.path}), {status:400, code:'INVALID_FILE_PATH'});
});
