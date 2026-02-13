import { createTRPCRouter } from '../init'
import { todosRouter } from './todos'
import { postsRouter } from './posts'

export const trpcRouter = createTRPCRouter({
  todos: todosRouter,
  posts: postsRouter,
})

export type TRPCRouter = typeof trpcRouter
