import { baseProcedure } from '../init'

export const publicProcedure = baseProcedure

// Add more procedures here as needed, e.g.:
// export const authedProcedure = baseProcedure.use(async ({ ctx, next }) => {
//   if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
//   return next({ ctx: { ...ctx, user: ctx.user } })
// })
