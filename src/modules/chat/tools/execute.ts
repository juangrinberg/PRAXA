import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { toConnectionDto } from '@/modules/integrations/contract';
import { readConnectionRecord } from '@/modules/integrations/repository/connections';
import type { TenantContext } from '@/modules/tenant/context';
import { ChatLimitError, type ChatTurnBudget } from '../limits';
import { connectionStatusResultSchema, type ConnectionStatusResult } from './results';

export class ChatToolError extends Error {
  constructor() {
    super('No se pudo consultar el estado de la conexión.');
    this.name = 'ChatToolError';
  }
}

/**
 * Implementación de connection_status, interna al servidor. El caller construye K01
 * con requireTenantContext(); no es una Server Action que acepte un tenant del cliente.
 * Reutiliza la lectura existente con JWT/RLS y el DTO que oculta campos internos.
 * La inyección de supabase es solo para pruebas, como en el repositorio de conexiones.
 */
export async function executeConnectionStatus(
  context: TenantContext,
  budget: ChatTurnBudget,
  deps: { supabase?: SupabaseClient } = {},
): Promise<ConnectionStatusResult> {
  try {
    return await budget.run(async () => {
      // El repositorio no admite AbortSignal: el presupuesto descarta una respuesta
      // tardía, pero no afirma cancelar la consulta HTTP que ya está en vuelo.
      const record = await readConnectionRecord(context, deps);
      return connectionStatusResultSchema.parse({
        tool_call_id: crypto.randomUUID(),
        name: 'connection_status',
        data: record === null ? { known: false, reason: 'integration_missing' }
          : { known: true, value: toConnectionDto(record) },
      });
    });
  } catch (error) {
    if (error instanceof ChatLimitError) throw error;
    // Sin message/cause de la base ni contenido de la pregunta en el error.
    throw new ChatToolError();
  }
}
