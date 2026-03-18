import { RPCHandler } from '@orpc/server/fetch'
import { orpcRouter } from '@/integrations/orpc/routers'
import { createFileRoute } from '@tanstack/react-router'

const handler = new RPCHandler(orpcRouter)

async function requestHandler({ request }: { request: Request }) {
  const { matched, response } = await handler.handle(request, {
    prefix: '/api/orpc',
    context: {},
  })

  if (matched) {
    return response
  }

  return new Response('Not Found', { status: 404 })
}

export const Route = createFileRoute('/api/orpc/$')({
  server: {
    handlers: {
      GET: requestHandler,
      POST: requestHandler,
    },
  },
})
