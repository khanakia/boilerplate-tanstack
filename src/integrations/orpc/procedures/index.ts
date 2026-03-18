import { base } from '../init'

export const publicProcedure = base

// Add more procedures here as needed, e.g.:
// export const authedProcedure = base.use(async ({ context, next }) => {
//   if (!context.user) throw new ORPCError('UNAUTHORIZED')
//   return next({ context: { ...context, user: context.user } })
// })
