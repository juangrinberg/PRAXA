-- PRAXA — Registro por consulta del chat (M25a.1).
--
-- Este archivo se escribe antes de la migración 0014, siguiendo TDD. Mientras 0014 no
-- exista, debe fallar porque todavía no existen chat_query_records, record_query ni
-- set_feedback.
--
-- Cubre CA-38c, CA-62, CA-64, CA-65, CA-67 y CA-69, además de las restricciones de
-- datos fijadas por M25a.1. Las conexiones sintéticas se crean mediante worker_api, como
-- en las pruebas existentes del conector.

begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

-- ---------------------------------------------------------------------------
-- Semilla sintética
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000401',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'chat.uno@praxa.test', 'x', now(), now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000402',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'chat.dos@praxa.test', 'x', now(), now(), now());

insert into public.companies (id, name, owner_id)
values
  ('c0a00000-0000-4000-8000-000000000401', 'Empresa de chat 1',
   'aaaaaaaa-0000-4000-8000-000000000401'),
  ('c0a00000-0000-4000-8000-000000000402', 'Empresa de chat 2',
   'aaaaaaaa-0000-4000-8000-000000000402');

select 1 from worker_api.create_pending_connection(
  'aaaaaaaa-0000-4000-8000-000000000401',
  'c0a00000-0000-4000-8000-000000000401',
  'cc000000-0000-4000-8000-000000000401',
  'negocio_chat_401', 'AAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAA==',
  1, 'system_user', 'app_sintetica', '{ads_read}', null
);

select 1 from worker_api.confirm_connection(
  'aaaaaaaa-0000-4000-8000-000000000401',
  'c0a00000-0000-4000-8000-000000000401',
  'cc000000-0000-4000-8000-000000000401',
  'cuenta_chat_401', 'USD', 'UTC', true
);

select 1 from worker_api.create_pending_connection(
  'aaaaaaaa-0000-4000-8000-000000000402',
  'c0a00000-0000-4000-8000-000000000402',
  'cc000000-0000-4000-8000-000000000402',
  'negocio_chat_402', 'AAAA', 'AAAAAAAAAAAAAAAA', 'AAAAAAAAAAAAAAAAAAAAAA==',
  1, 'system_user', 'app_sintetica', '{ads_read}', null
);

select 1 from worker_api.confirm_connection(
  'aaaaaaaa-0000-4000-8000-000000000402',
  'c0a00000-0000-4000-8000-000000000402',
  'cc000000-0000-4000-8000-000000000402',
  'cuenta_chat_402', 'USD', 'UTC', true
);

create temp table chat_query_ids (
  label text primary key,
  query_id uuid not null
);

-- ---------------------------------------------------------------------------
-- Tabla, restricciones y privilegios
-- ---------------------------------------------------------------------------

select has_table(
  'public',
  'chat_query_records',
  'T-01: existe public.chat_query_records'
);

select columns_are(
  'public',
  'chat_query_records',
  array[
    'id', 'company_id', 'connection_id', 'question_redacted', 'tool_names',
    'outcome', 'reason', 'latency_ms', 'requested_model_id',
    'reported_model_id', 'feedback', 'created_at'
  ],
  'T-02: chat_query_records tiene las columnas del contrato'
);

select results_eq(
  $$select a.attname::text collate "default",
           format_type(a.atttypid, a.atttypmod) collate "default",
           a.attnotnull
      from pg_catalog.pg_attribute a
     where a.attrelid = 'public.chat_query_records'::regclass
       and a.attnum > 0 and not a.attisdropped
     order by a.attname$$,
  $$values
    ('company_id'::text, 'uuid'::text, true),
    ('connection_id'::text, 'uuid'::text, false),
    ('created_at'::text, 'timestamp with time zone'::text, true),
    ('feedback'::text, 'text'::text, false),
    ('id'::text, 'uuid'::text, true),
    ('latency_ms'::text, 'integer'::text, true),
    ('outcome'::text, 'text'::text, true),
    ('question_redacted'::text, 'text'::text, true),
    ('reason'::text, 'text'::text, false),
    ('reported_model_id'::text, 'text'::text, false),
    ('requested_model_id'::text, 'text'::text, false),
    ('tool_names'::text, 'text[]'::text, true)$$,
  'T-03: tipos y nulabilidad de chat_query_records coinciden con el contrato'
);

select results_eq(
  $$select c.relrowsecurity, c.relforcerowsecurity
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'chat_query_records'$$,
  $$values (true, true)$$,
  'T-04: chat_query_records tiene RLS habilitada y forzada'
);

select ok(
  not has_table_privilege('authenticated', 'public.chat_query_records', 'SELECT'),
  'T-05: authenticated no puede leer registros del chat'
);

select ok(
  not has_table_privilege('authenticated', 'public.chat_query_records', 'INSERT'),
  'T-06: authenticated no puede insertar registros del chat'
);

select ok(
  not has_table_privilege('authenticated', 'public.chat_query_records', 'UPDATE'),
  'T-07: authenticated no puede actualizar registros del chat'
);

select ok(
  not has_table_privilege('authenticated', 'public.chat_query_records', 'DELETE'),
  'T-08: authenticated no puede borrar registros del chat'
);

select ok(
  has_function_privilege(
    'praxa_integrations',
    'worker_api.record_query(uuid, uuid, uuid, integer, text, text[], text, text, integer, text, text)',
    'EXECUTE'
  ),
  'T-09: praxa_integrations puede ejecutar record_query'
);

select ok(
  has_function_privilege(
    'praxa_integrations',
    'worker_api.set_feedback(uuid, uuid, uuid, text)',
    'EXECUTE'
  ),
  'T-10: praxa_integrations puede ejecutar set_feedback'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'worker_api.record_query(uuid, uuid, uuid, integer, text, text[], text, text, integer, text, text)',
    'EXECUTE'
  ),
  'T-11: authenticated no puede ejecutar record_query'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'worker_api.set_feedback(uuid, uuid, uuid, text)',
    'EXECUTE'
  ),
  'T-12: authenticated no puede ejecutar set_feedback'
);

-- ---------------------------------------------------------------------------
-- record_query: registro válido y conexión nula
-- ---------------------------------------------------------------------------

insert into chat_query_ids (label, query_id)
select 'a-initial', query_id
  from worker_api.record_query(
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    'cc000000-0000-4000-8000-000000000401',
    0,
    'Ventas de septiembre',
    array['total', 'coverage']::text[],
    'answered',
    null,
    120,
    null,
    null
  );

select ok(
  (select query_id is not null from chat_query_ids where label = 'a-initial'),
  'T-13: record_query devuelve el identificador opaco del registro'
);

select ok(
  (select
     r.company_id = 'c0a00000-0000-4000-8000-000000000401'::uuid
     and r.connection_id = 'cc000000-0000-4000-8000-000000000401'::uuid
     and r.question_redacted = 'Ventas de septiembre'
     and r.tool_names = array['total', 'coverage']::text[]
     and r.outcome = 'answered'
     and r.reason is null
     and r.latency_ms = 120
     and r.requested_model_id is null
     and r.reported_model_id is null
   from public.chat_query_records r
   join chat_query_ids q on q.query_id = r.id
  where q.label = 'a-initial'),
  'T-14: record_query guarda los datos permitidos del registro'
);

select ok(
  (select feedback is null
     from public.chat_query_records r
     join chat_query_ids q on q.query_id = r.id
    where q.label = 'a-initial'),
  'T-15: el feedback comienza siendo nulo'
);

insert into chat_query_ids (label, query_id)
select 'no-connection', query_id
  from worker_api.record_query(
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    null,
    null,
    '¿Qué sistemas están conectados?',
    array[]::text[],
    'not_answered',
    'connection_not_active',
    10,
    null,
    null
  );

select ok(
  (select query_id is not null from chat_query_ids where label = 'no-connection'),
  'T-16: record_query permite registrar una consulta sin conexión'
);

select ok(
  (select
     r.connection_id is null
     and r.outcome = 'not_answered'
     and r.reason = 'connection_not_active'
   from public.chat_query_records r
   join chat_query_ids q on q.query_id = r.id
  where q.label = 'no-connection'),
  'T-17: una consulta sin conexión queda como abstención por connection_not_active'
);

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      null, 0, 'consulta inválida', array[]::text[],
      'not_answered', 'connection_not_active', 10, null, null)$$,
  '22023',
  null,
  'T-18: una generación no nula sin conexión se rechaza'
);

-- ---------------------------------------------------------------------------
-- Restricciones de argumentos
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 0,
      'consulta inválida', array['total']::text[],
      'invented_outcome', null, 10, null, null)$$,
  '22023', null,
  'T-19: outcome fuera del catálogo se rechaza'
);

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 0,
      'consulta inválida', array['total']::text[],
      'not_answered', 'motivo_inventado', 10, null, null)$$,
  '22023', null,
  'T-20: reason fuera del catálogo se rechaza'
);

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 0,
      repeat('x', 501), array['total']::text[],
      'answered', null, 10, null, null)$$,
  '22023', null,
  'T-21: pregunta de más de 500 caracteres se rechaza'
);

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 0,
      'consulta inválida', array['sql_arbitrario']::text[],
      'answered', null, 10, null, null)$$,
  '22023', null,
  'T-22: tool fuera del catálogo cerrado se rechaza'
);

-- ---------------------------------------------------------------------------
-- Aislamiento entre empresas
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000402', 0,
      'consulta cruzada', array['total']::text[],
      'answered', null, 10, null, null)$$,
  'PX001', null,
  'T-23: record_query no permite usar la conexión de otra empresa'
);

insert into chat_query_ids (label, query_id)
select 'b-initial', query_id
  from worker_api.record_query(
    'aaaaaaaa-0000-4000-8000-000000000402',
    'c0a00000-0000-4000-8000-000000000402',
    'cc000000-0000-4000-8000-000000000402',
    0,
    'Consulta de empresa dos',
    array['total']::text[],
    'answered', null, 100, null, null
  );

select ok(
  (select query_id is not null from chat_query_ids where label = 'b-initial'),
  'T-24: la empresa dos puede registrar su propia consulta'
);

select throws_ok(
  format(
    'select * from worker_api.set_feedback(%L::uuid, %L::uuid, %L::uuid, %L)',
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    (select query_id from chat_query_ids where label = 'b-initial'),
    'useful'
  ),
  'PX001', null,
  'T-25: set_feedback no permite votar el registro de otra empresa'
);

-- ---------------------------------------------------------------------------
-- set_feedback
-- ---------------------------------------------------------------------------

select results_eq(
  format(
    'select query_id, feedback from worker_api.set_feedback(%L::uuid, %L::uuid, %L::uuid, %L)',
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    (select query_id from chat_query_ids where label = 'a-initial'),
    'useful'
  ),
  format(
    $$values (%L::uuid, 'useful'::text)$$,
    (select query_id from chat_query_ids where label = 'a-initial')
  ),
  'T-26: set_feedback guarda useful y devuelve el registro actualizado'
);

select is(
  (select feedback from public.chat_query_records r
    join chat_query_ids q on q.query_id = r.id
   where q.label = 'a-initial'),
  'useful',
  'T-27: el voto useful queda persistido'
);

select results_eq(
  format(
    'select query_id, feedback from worker_api.set_feedback(%L::uuid, %L::uuid, %L::uuid, %L)',
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    (select query_id from chat_query_ids where label = 'a-initial'),
    'not_useful'
  ),
  format(
    $$values (%L::uuid, 'not_useful'::text)$$,
    (select query_id from chat_query_ids where label = 'a-initial')
  ),
  'T-28: set_feedback permite reemplazar el voto anterior'
);

select throws_ok(
  format(
    'select * from worker_api.set_feedback(%L::uuid, %L::uuid, %L::uuid, %L)',
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    (select query_id from chat_query_ids where label = 'a-initial'),
    'maybe'
  ),
  '22023', null,
  'T-29: set_feedback rechaza valores fuera de useful/not_useful'
);

select throws_ok(
  $$select * from worker_api.set_feedback(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'ffffffff-0000-4000-8000-000000000401',
      'useful')$$,
  'PX001', null,
  'T-30: set_feedback rechaza un registro inexistente'
);

-- ---------------------------------------------------------------------------
-- CA-38c: generación y desconexión
-- ---------------------------------------------------------------------------

update public.integration_connections
   set credential_generation = credential_generation + 1
 where id = 'cc000000-0000-4000-8000-000000000401';

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 0,
      'generación vieja', array['total']::text[],
      'answered', null, 10, null, null)$$,
  'PX006', null,
  'T-31: record_query rechaza una generación vieja'
);

insert into chat_query_ids (label, query_id)
select 'a-generation-1', query_id
  from worker_api.record_query(
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    'cc000000-0000-4000-8000-000000000401',
    1,
    'generación vigente', array['total']::text[],
    'answered', null, 10, null, null
  );

select ok(
  (select query_id is not null from chat_query_ids where label = 'a-generation-1'),
  'T-32: record_query acepta la generación vigente'
);

select lives_ok(
  $$select 1 from worker_api.begin_disconnect(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401')$$,
  'T-33: la conexión sintética se puede desconectar'
);

select throws_ok(
  $$select * from worker_api.record_query(
      'aaaaaaaa-0000-4000-8000-000000000401',
      'c0a00000-0000-4000-8000-000000000401',
      'cc000000-0000-4000-8000-000000000401', 1,
      'conexión desconectada', array['total']::text[],
      'answered', null, 10, null, null)$$,
  'PX004', null,
  'T-34: record_query rechaza escribir después de la desconexión'
);

-- ---------------------------------------------------------------------------
-- Purga y retención
-- ---------------------------------------------------------------------------

select is(
  worker_api.purge_connection(
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    'cc000000-0000-4000-8000-000000000401'
  ),
  true,
  'T-35: purge_connection borra la conexión desconectada'
);

select is(
  (select count(*)::int from public.chat_query_records
    where company_id = 'c0a00000-0000-4000-8000-000000000401'),
  0,
  'T-36: la purga borra los registros asociados a la conexión'
);

select is(
  worker_api.purge_connection(
    'aaaaaaaa-0000-4000-8000-000000000401',
    'c0a00000-0000-4000-8000-000000000401',
    'cc000000-0000-4000-8000-000000000401'
  ),
  false,
  'T-37: repetir la purga de una conexión inexistente no falla'
);

select is(
  (select count(*)::int from public.chat_query_records
    where company_id = 'c0a00000-0000-4000-8000-000000000402'),
  1,
  'T-38: la purga de una empresa no borra registros de otra empresa'
);

select is(
  (select count(*)::int from public.chat_query_records r
    join chat_query_ids q on q.query_id = r.id
   where q.label = 'no-connection'),
  1,
  'T-39: un registro sin conexión no se borra al purgar otra conexión'
);

select * from finish();
rollback;
