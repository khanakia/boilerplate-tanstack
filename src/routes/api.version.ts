import { createFileRoute } from '@tanstack/react-router'
import { getBuildInfo } from '@/lib/buildinfo'

export const Route = createFileRoute('/api/version')({
  server: {
    handlers: {
      GET: () => Response.json(getBuildInfo()),
    },
  },
})
