import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

import type { TRPCRouter } from '@/integrations/trpc/routers'
import type { ORPCClient } from '@/integrations/orpc/react'

import { TRPCProvider } from '@/integrations/trpc/react'

function getUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return ''
    return `http://localhost:${process.env.PORT ?? 3000}`
  })()
  return `${base}/api/trpc`
}

function getOrpcUrl() {
  const base = (() => {
    if (typeof window !== 'undefined') return window.location.origin
    return `http://localhost:${process.env.PORT ?? 3000}`
  })()
  return `${base}/api/orpc`
}

export const trpcClient = createTRPCClient<TRPCRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: getUrl(),
    }),
  ],
})

const orpcLink = new RPCLink({
  url: getOrpcUrl(),
})

export const orpcClient: ORPCClient = createORPCClient(orpcLink)

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  })

  const orpcUtils = createTanstackQueryUtils(orpcClient)

  return {
    queryClient,
    trpc: serverHelpers,
    orpc: orpcUtils,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
