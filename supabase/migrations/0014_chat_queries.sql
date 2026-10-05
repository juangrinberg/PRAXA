-- PRAXA 0014 — registro determinístico de consultas del chat (M25a.1)
--
-- Esta migración no conecta ningún LLM. Persiste únicamente el registro mínimo
-- necesario para auditar una consulta, expone dos operaciones cerradas por
-- worker_api y extiende la purga de conexiones para eliminar sus registros.

-- ---------------------------------------------------------------------------
-- Registro por consulta
-- ---------------------------------------------------------------------------

create table public.chat_query_records (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies (id) on delete cascade,
  connection_id        uuid,
  question_redacted    text not null,
  tool_names           text[] not null default '{}'::text[],
  outcome              text not null,
  reason               text,
  latency_ms           integer not null,
  requested_model_id   text,
  reported_model_id    text,
  feedback             text,
  created_at           timestamptz not null default now(),

  constraint chat_query_records_connection_fkey
    foreign key (company_id, connection_id)
    references public.integration_connections (company_id, id)
    on delete cascade,

  constraint chat_query_records_question_length
    check (char_length(question_redacted) between 1 and 500),

  constraint chat_query_records_tools_closed
    check (tool_names <@ array[
      'coverage',
      'daily_series',
      'total',
      'connection_status'
    ]::text[]),

  constraint chat_query_records_outcome_closed
    check (outcome in (
      'answered',
      'answered_partial_coverage',
      'not_answered'
    )),

  constraint chat_query_records_reason_closed
    check (
      reason is null
      or reason in (
        'out_of_scope',
        'no_coverage',
        'connection_not_active',
        'guard_rejected',
        'model_unavailable',
        'tool_error'
      )
    ),

  constraint chat_query_records_reason_coherence
    check (
      (outcome = 'not_answered' and reason is not null)
      or
      (outcome <> 'not_answered' and reason is null)
    ),

  constraint chat_query_records_latency_nonnegative
    check (latency_ms >= 0),

  constraint chat_query_records_feedback_closed
    check (feedback is null or feedback in ('useful', 'not_useful'))
);

create index chat_query_records_company_created_at_idx
  on public.chat_query_records (company_id, created_at desc);

alter table public.chat_query_records enable row level security;
alter table public.chat_query_records force row level security;

revoke all on table public.chat_query_records
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- record_query
-- ---------------------------------------------------------------------------

create function worker_api.record_query(
  p_actor_user_id        uuid,
  p_company_id           uuid,
  p_connection_id        uuid,
  p_expected_generation  integer,
  p_question_redacted    text,
  p_tool_names           text[],
  p_outcome              text,
  p_reason               text,
  p_latency_ms           integer,
  p_requested_model_id   text,
  p_reported_model_id    text
)
returns table (query_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.integration_connections;
  v_query_id uuid;
begin
  perform private.assert_worker_actor(
    p_actor_user_id,
    p_company_id
  );

  if p_question_redacted is null
     or char_length(p_question_redacted) not between 1 and 500
     or p_tool_names is null
     or not (
       p_tool_names <@ array[
         'coverage',
         'daily_series',
         'total',
         'connection_status'
       ]::text[]
     )
     or p_outcome is null
     or p_outcome not in (
       'answered',
       'answered_partial_coverage',
       'not_answered'
     )
     or (
       p_reason is not null
       and p_reason not in (
         'out_of_scope',
         'no_coverage',
         'connection_not_active',
         'guard_rejected',
         'model_unavailable',
         'tool_error'
       )
     )
     or (p_outcome = 'not_answered' and p_reason is null)
     or (p_outcome <> 'not_answered' and p_reason is not null)
     or p_latency_ms is null
     or p_latency_ms < 0 then
    raise exception
      'praxa: argumento inválido'
      using errcode = '22023';
  end if;

  if p_connection_id is null then
    if p_expected_generation is not null
       or p_outcome is distinct from 'not_answered'
       or p_reason is distinct from 'connection_not_active' then
      raise exception
        'praxa: argumento inválido'
        using errcode = '22023';
    end if;
  else
    if p_expected_generation is null then
      raise exception
        'praxa: argumento inválido'
        using errcode = '22023';
    end if;

    perform private.lock_company(p_company_id);

    select c.*
      into v_connection
      from public.integration_connections c
     where c.id = p_connection_id
       and c.company_id = p_company_id
     for update;

    if not found then
      raise exception
        'praxa: operación no autorizada'
        using errcode = 'PX001';
    end if;

    if v_connection.status <> 'active' then
      raise exception
        'praxa: transición de estado no permitida'
        using errcode = 'PX004';
    end if;

    if v_connection.credential_generation <> p_expected_generation then
      raise exception
        'praxa: generación no vigente'
        using errcode = 'PX006';
    end if;
  end if;

  insert into public.chat_query_records (
    company_id,
    connection_id,
    question_redacted,
    tool_names,
    outcome,
    reason,
    latency_ms,
    requested_model_id,
    reported_model_id
  )
  values (
    p_company_id,
    p_connection_id,
    p_question_redacted,
    p_tool_names,
    p_outcome,
    p_reason,
    p_latency_ms,
    p_requested_model_id,
    p_reported_model_id
  )
  returning id into v_query_id;

  return query
  select v_query_id;

exception
  when integrity_constraint_violation then
    raise exception
      'praxa: argumento inválido'
      using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------
-- set_feedback
-- ---------------------------------------------------------------------------

create function worker_api.set_feedback(
  p_actor_user_id uuid,
  p_company_id    uuid,
  p_query_id      uuid,
  p_feedback      text
)
returns table (
  query_id uuid,
  feedback text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query public.chat_query_records;
begin
  perform private.assert_worker_actor(
    p_actor_user_id,
    p_company_id
  );

  if p_query_id is null
     or p_feedback not in ('useful', 'not_useful') then
    raise exception
      'praxa: argumento inválido'
      using errcode = '22023';
  end if;

  perform private.lock_company(p_company_id);

  select r.*
    into v_query
    from public.chat_query_records r
   where r.id = p_query_id
     and r.company_id = p_company_id
   for update;

  if not found then
    raise exception
      'praxa: operación no autorizada'
      using errcode = 'PX001';
  end if;

  update public.chat_query_records
     set feedback = p_feedback
   where id = p_query_id
     and company_id = p_company_id;

  return query
  select p_query_id, p_feedback;

exception
  when integrity_constraint_violation then
    raise exception
      'praxa: argumento inválido'
      using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------
-- Purga extendida
-- ---------------------------------------------------------------------------

create or replace function worker_api.purge_connection(
  p_actor_user_id uuid,
  p_company_id    uuid,
  p_connection_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.integration_connections;
  v_constraint text;
begin
  perform private.assert_worker_actor(
    p_actor_user_id,
    p_company_id
  );

  if p_connection_id is null then
    raise exception
      'praxa: argumento inválido'
      using errcode = '22023';
  end if;

  perform private.lock_company(p_company_id);

  select c.*
    into v_connection
    from public.integration_connections c
   where c.id = p_connection_id
     and c.company_id = p_company_id
   for update;

  if not found then
    return false;
  end if;

  if v_connection.status <> 'disconnected' then
    raise exception
      'praxa: transición de estado no permitida'
      using errcode = 'PX004';
  end if;

  delete from public.chat_query_records
   where company_id = p_company_id
     and connection_id = p_connection_id;

  delete from private.integration_credentials
   where connection_id = p_connection_id
     and company_id = p_company_id;

  delete from public.integration_connections
   where id = p_connection_id
     and company_id = p_company_id;

  return true;

exception
  when integrity_constraint_violation then
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint = 'integration_connections_account_key' then
      raise exception
        'praxa: la cuenta ya está vinculada'
        using errcode = 'PX007';

    elsif v_constraint = 'integration_connections_one_live_per_company' then
      raise exception
        'praxa: la empresa ya tiene una conexión'
        using errcode = 'PX003';

    elsif v_constraint in (
      'integration_connections_pkey',
      'integration_credentials_pkey'
    ) then
      raise exception
        'praxa: operación no autorizada'
        using errcode = 'PX001';

    else
      raise exception
        'praxa: argumento inválido'
        using errcode = '22023';
    end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios
-- ---------------------------------------------------------------------------

revoke all on function worker_api.record_query(
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text[],
  text,
  text,
  integer,
  text,
  text
) from public, anon, authenticated, service_role;

grant execute on function worker_api.record_query(
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text[],
  text,
  text,
  integer,
  text,
  text
) to praxa_integrations;

revoke all on function worker_api.set_feedback(
  uuid,
  uuid,
  uuid,
  text
) from public, anon, authenticated, service_role;

grant execute on function worker_api.set_feedback(
  uuid,
  uuid,
  uuid,
  text
) to praxa_integrations;

revoke all on function worker_api.purge_connection(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function worker_api.purge_connection(
  uuid,
  uuid,
  uuid
) to praxa_integrations;