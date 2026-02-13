import { createFileRoute } from '@tanstack/react-router'
import { getBootInfo } from '@/lib/bootinfo'
import { guardInternalApi } from '@/lib/middleware'

export const Route = createFileRoute('/api/i/bootinfo')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const denied = guardInternalApi(request)
        if (denied) return denied

        return Response.json(getBootInfo())
      },
    },
  },
})
