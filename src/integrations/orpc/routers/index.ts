import { todosRouter } from './todos'
import { postsRouter } from './posts'

export const orpcRouter = {
  todos: todosRouter,
  posts: postsRouter,
}
