import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/modules/tenant/context';
import {
  integrationConnectionRecordSchema,
  toConnectionDto,
} from '@/modules/integrations/contract';

import type { ChatToolCall } from '@/modules/chat/tools/schema';
import type { ChatToolResult } from '@/modules/chat/tools/results';

export async function executeChatTool(
  call: ChatToolCall,
): Promise<ChatToolResult> {
  if (call.name !== 'connection_status') {
    throw new Error(`La tool ${call.name} todavía no está implementada.`);
  }

  const tenant = await requireTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('company_id', tenant.company_id);

  if (error) {
    throw new Error('No se pudo consultar el estado de las conexiones.');
  }

  const connections = (data ?? []).map((row) =>
    toConnectionDto(integrationConnectionRecordSchema.parse(row)),
  );

  return {
    name: 'connection_status',
    data: {
      connections,
    },
  };
}