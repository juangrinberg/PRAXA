import { randomInt, randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { resolveIntegrationsTestTarget, resolveSqlTestTarget } from '../../scripts/lib/sql-target.mjs';
import { verifiedTestDbConfig } from '../../scripts/lib/test-db-client.mjs';
import {
  anonClient,
  blockedReason,
  cleanupRun,
  createConfirmedUser,
  pendingCleanupCount,
  remoteProjectReachable,
  RUN_ID,
  type TestUser,
} from './helpers';

const runtime = vi.hoisted(() => ({ client: null as SupabaseClient | null }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => {
    if (!runtime.client) throw new Error('Cliente de prueba no seleccionado.');
    return runtime.client;
  },
}));

import { loadMetaStrategyView, type MetaStrategyView } from '@/modules/strategies';

const LIMITS = '{"lookbackDays":28,"maxWindowDays":28,"maxPagesPerLevel":1,"maxMetadataPages":1,"maxEntities":500,"maxPayloadBytes":1000000,"maxDurationMs":1000,"finalizationReserveMs":1000,"leaseSeconds":2,"maxRetries":2,"retryDelayMs":500}';
const UNKNOWN_ATTR = '{"known":false,"report_time":"impression","unified":true,"settings":[]}';

type Seeded = Readonly<{ user: TestUser; companyId: string; connectionId: string; prefix: string }>;

async function seedCompany(admin: pg.Client, prefix: string, campaignCount: number): Promise<Seeded> {
  const user = await createConfirmedUser(`m26b-${prefix}`);
  const created = await user.client.rpc('create_company_for_current_user',
    { p_name: `Empresa sintética M26b ${RUN_ID} ${prefix}` }).single<{ id: string }>();
  if (created.error || !created.data) throw new Error('No se pudo crear la empresa sintética de M26b.');
  const companyId = created.data.id;
  const connectionId = randomUUID();
  await admin.query(`select 1 from worker_api.create_pending_connection($1,$2,$3,'meta','negocio_sintetico',
    'AAAA','AAAAAAAAAAAAAAAA','AAAAAAAAAAAAAAAAAAAAAA==',1,'system_user','app_sintetica','{ads_read}',null)`,
  [user.id, companyId, connectionId]);
  await admin.query(`select 1 from worker_api.confirm_connection($1,$2,$3,$4,'USD','UTC',true)`,
    [user.id, companyId, connectionId, `act_${randomInt(1_000_000, 2_000_000_000)}`]);
  await admin.query(`select worker_api.save_diagnostic_settings($1,$2,'purchase','actions:purchase')`,
    [user.id, companyId]);

  const runId = randomUUID();
  await admin.query(`select 1 from worker_api.start_sync_run($1,$2,$3,0,$4,$5,current_date-27,current_date-1,$6::jsonb)`,
    [user.id, companyId, connectionId, runId, 'e'.repeat(64), LIMITS]);
  await admin.query(`insert into public.meta_insight_snapshots (id,company_id,connection_id,sync_run_id,level,
      fetched_at,window_from,window_to,currency,timezone,pages,validated_pages,complete,result,failure_reason,
      error_class,parameters,duration_ms,request_payload)
    select gen_random_uuid(),$1,$2,$3,lvl,now(),current_date-56,current_date-1,'USD','UTC',1,1,true,'complete',
      null,null,'{}'::jsonb,1,'{}'::jsonb
      from unnest(array['account','campaign','adset','ad']) lvl`, [companyId, connectionId, runId]);

  await admin.query(`insert into public.meta_entities (entity_ref,company_id,connection_id,level,external_id,parent_ref)
    values (gen_random_uuid(),$1,$2,'account','acct',null)`, [companyId, connectionId]);
  await admin.query(`insert into public.meta_entities (entity_ref,company_id,connection_id,level,external_id,parent_ref)
    select gen_random_uuid(),$1::uuid,$2::uuid,'campaign','campaign-'||n,
      (select entity_ref from public.meta_entities where connection_id=$2::uuid and level='account')
      from generate_series(1,$3::int) n`, [companyId, connectionId, campaignCount]);

  await admin.query(`insert into public.meta_daily_coverage (connection_id,level,date,company_id,snapshot_id,
      fetched_at,captured_before_day_end,currency,timezone,entities,rows)
    select $2::uuid,'account',current_date-1-i,$1::uuid,
      (select id from public.meta_insight_snapshots where connection_id=$2::uuid and level='account'),
      now(),false,'USD','UTC',
      jsonb_build_array(jsonb_build_object('entity_ref',a.entity_ref,'level','account','parent_ref',null,
        'name','Cuenta sintética '||$3::text,'effective_status','ACTIVE','objective',null,
        'metadata_fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'attribution',$4::jsonb)),
      jsonb_build_array(jsonb_build_object('entity_ref',a.entity_ref,
        'spend',case when i < 28 then '130' else '100' end,
        'impressions','1000','reach',null,
        'clicks',case when i < 7 then '60' else '100' end,
        'inline_link_clicks','50','ctr',null,'cpc',null,'cpm',null,'frequency',null,
        'actions',jsonb_build_array(jsonb_build_object('action_type','purchase','variant','value',
          'count','2','value','30')),'attribution',$4::jsonb))
      from public.meta_entities a cross join generate_series(0,55) i
      where a.connection_id=$2::uuid and a.level='account'`,
  [companyId, connectionId, prefix, UNKNOWN_ATTR]);

  await admin.query(`with ents as (
      select entity_ref,parent_ref,external_id,
        row_number() over (order by external_id)::int n
      from public.meta_entities where connection_id=$2::uuid and level='campaign')
    insert into public.meta_daily_coverage (connection_id,level,date,company_id,snapshot_id,
      fetched_at,captured_before_day_end,currency,timezone,entities,rows)
    select $2::uuid,'campaign',current_date-1-i,$1::uuid,
      (select id from public.meta_insight_snapshots where connection_id=$2::uuid and level='campaign'),
      now(),false,'USD','UTC',
      (select jsonb_agg(jsonb_build_object('entity_ref',entity_ref,'level','campaign','parent_ref',parent_ref,
        'name','Campaña sintética '||$3::text||' '||n,'effective_status','ACTIVE','objective','OUTCOME_SALES',
        'metadata_fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'attribution',$4::jsonb) order by n) from ents),
      (select jsonb_agg(jsonb_build_object('entity_ref',entity_ref,
        'spend',case when i < 28 and n % 2 = 0 then '130' else '100' end,
        'impressions','1000','reach',null,'clicks','100','inline_link_clicks','50',
        'ctr',null,'cpc',null,'cpm',null,'frequency',null,
        'actions',jsonb_build_array(jsonb_build_object('action_type','purchase','variant','value',
          'count',case when i < 28 and n % 2 = 1 then '3' else '2' end,'value','30')),
        'attribution',$4::jsonb) order by n) from ents)
      from generate_series(0,55) i`, [companyId, connectionId, prefix, UNKNOWN_ATTR]);

  await admin.query(`update public.integration_connections c set meta_sync_summary = jsonb_build_object(
      'version',1,'credential_generation',c.credential_generation,
      'window_from',(current_date-28)::text,'window_to',(current_date-1)::text,'max_window_days',28,
      'started_at',to_char((now()-interval '2 minutes') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'lease_expires_at',to_char((now()-interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'finished_at',to_char((now()-interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'status','completed','levels',jsonb_build_object(
        'account',jsonb_build_object('status','complete','reason','complete','fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'finished_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
        'campaign',jsonb_build_object('status','complete','reason','complete','fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'finished_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
        'adset',jsonb_build_object('status','complete','reason','complete','fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'finished_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
        'ad',jsonb_build_object('status','complete','reason','complete','fetched_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'finished_at',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))))
    where c.id=$1`, [connectionId]);

  return { user, companyId, connectionId, prefix };
}

describe('M26b — adaptador real de estrategias en el desechable', () => {
  let admin: pg.Client;
  let main: Seeded;
  let other: Seeded;
  let mainLoad: Promise<{ view: MetaStrategyView; durationMs: number; entityPages: number }>;

  beforeAll(async () => {
    const integrations = resolveIntegrationsTestTarget(process.env);
    if (!integrations.ok) throw new Error(integrations.problems?.join(' ') ?? 'Destino de pruebas inválido.');
    const sql = resolveSqlTestTarget(process.env);
    if (!sql.ok) throw new Error('Destino SQL de prueba inválido.');
    const blocked = blockedReason();
    if (blocked) throw new Error(blocked);
    if (!(await remoteProjectReachable())) throw new Error('El proyecto de pruebas no responde.');
    admin = new pg.Client(verifiedTestDbConfig(sql.connectionString, 'praxa-strategies-test'));
    await admin.connect();
    main = await seedCompany(admin, 'A', 500);
    other = await seedCompany(admin, 'B', 2);
  }, 180_000);

  afterAll(async () => {
    try {
      await admin?.end();
    } finally {
      runtime.client = null;
      await cleanupRun();
      expect(pendingCleanupCount()).toBe(0);
    }
  }, 120_000);

  function loadMain() {
    return mainLoad ??= (async () => {
      runtime.client = main.user.client;
      const rpc = vi.spyOn(main.user.client, 'rpc');
      const started = performance.now();
      const view = await loadMetaStrategyView({ mode: 'real' });
      const durationMs = Math.round(performance.now() - started);
      const entityPages = rpc.mock.calls.filter((call) => call[0] === 'meta_diagnostic_entity_metrics').length;
      rpc.mockRestore();
      return { view, durationMs, entityPages };
    })();
  }

  it('T-22/T-23: K01 y RLS aíslan A/B, anónimo no ejecuta RPC y el adaptador no escribe', async () => {
    const before = await admin.query(`select
      (select count(*) from public.integration_connections where company_id=$1)::int connections,
      (select count(*) from public.meta_daily_coverage where company_id=$1)::int coverage,
      (select count(*) from public.diagnostic_settings where company_id=$1)::int settings,
      (select count(*) from public.diagnostic_reports where company_id=$1)::int reports`, [main.companyId]);
    const a = (await loadMain()).view;
    runtime.client = other.user.client;
    const b = await loadMetaStrategyView({ mode: 'real' });
    expect(a.state).toBe('ready');
    expect(b.state).toBe('ready');
    expect(JSON.stringify(a)).toContain('Campaña sintética A');
    expect(JSON.stringify(a)).not.toContain('Campaña sintética B');
    expect(JSON.stringify(b)).toContain('Campaña sintética B');
    expect(JSON.stringify(b)).not.toContain('Campaña sintética A');

    const anonymous = anonClient();
    const rpc = vi.spyOn(anonymous, 'rpc');
    runtime.client = anonymous;
    await expect(loadMetaStrategyView({ mode: 'real' })).resolves.toEqual({
      state: 'unavailable', reason: 'tenant_unavailable',
    });
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockRestore();

    const after = await admin.query(`select
      (select count(*) from public.integration_connections where company_id=$1)::int connections,
      (select count(*) from public.meta_daily_coverage where company_id=$1)::int coverage,
      (select count(*) from public.diagnostic_settings where company_id=$1)::int settings,
      (select count(*) from public.diagnostic_reports where company_id=$1)::int reports`, [main.companyId]);
    expect(after.rows).toEqual(before.rows);
  }, 120_000);

  it('T-24: el fixture real combina R1 7+7 con R2/R3 28+28 y conserva procedencia', async () => {
    const { view } = await loadMain();
    expect(view.state).toBe('ready');
    if (view.state !== 'ready') return;
    expect(view.result.recommendations.some((item) => item.ruleId === 'R1'
      && item.metrics.some((metric) => metric.source === 'm25b_anomaly'))).toBe(true);
    expect(view.result.recommendations.some((item) => item.ruleId === 'R2'
      && item.metrics.some((metric) => metric.source === 'm26a_metric'))).toBe(true);
    expect(view.result.recommendations.some((item) => item.ruleId === 'R3')).toBe(true);
    expect(view.result.recommendations.every((item) => item.metrics.every((metric) =>
      metric.periods.baseline.to < metric.periods.current.from))).toBe(true);
  }, 120_000);

  it('T-25 — sin dependencias ajenas: el adaptador no consulta TN, GA4, chat, modelos o worker_api', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('src/modules/strategies/load.ts', 'utf8'));
    expect(source).not.toMatch(/tiendanube|ga4|chat|anthropic|deepinfra|worker_api/i);
  });

  it('T-26 — 500 campañas por 56 días: no trunca campañas y registra solo conteos', async () => {
    const { view, durationMs, entityPages } = await loadMain();
    expect(view.state).toBe('ready');
    if (view.state !== 'ready') return;
    expect(view.result.evaluated.scopes).toBe(501);
    expect(entityPages).toBe(3);
    expect(view.result.recommendations.filter((item) => item.priority === 'high').length).toBeGreaterThan(200);
    console.log(`M26b T-26 medición: duración_ms=${durationMs}; páginas_campaña=${entityPages}; `
      + `scopes=${view.result.evaluated.scopes}; candidatos=${view.result.evaluated.candidates}; `
      + `truncated=${view.result.truncated}`);
  }, 120_000);
});
