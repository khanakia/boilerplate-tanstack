import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { RouterClient } from '@orpc/server'
import type { orpcRouter } from './routers'

export type ORPCClient = RouterClient<typeof orpcRouter>

export function createORPCQueryUtils(client: ORPCClient) {
  return createTanstackQueryUtils(client)
}
