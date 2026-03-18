import { ORPCError } from '@orpc/server'
import { publicProcedure } from '../procedures'
import {
  addTodoInputSchema,
  toggleTodoInputSchema,
  deleteTodoInputSchema,
} from './schema/todos'

const todos = [
  { id: 1, name: 'Get groceries', completed: false },
  { id: 2, name: 'Buy a new phone', completed: false },
  { id: 3, name: 'Finish the project', completed: true },
]

let nextId = 4

export const todosRouter = {
  list: publicProcedure.handler(async () => todos),

  add: publicProcedure
    .input(addTodoInputSchema)
    .handler(async ({ input }) => {
      const newTodo = { id: nextId++, name: input.name, completed: false }
      todos.push(newTodo)
      return newTodo
    }),

  toggle: publicProcedure
    .input(toggleTodoInputSchema)
    .handler(async ({ input }) => {
      const todo = todos.find((t) => t.id === input.id)
      if (!todo) throw new ORPCError('NOT_FOUND', { message: 'Todo not found' })
      todo.completed = !todo.completed
      return todo
    }),

  delete: publicProcedure
    .input(deleteTodoInputSchema)
    .handler(async ({ input }) => {
      const index = todos.findIndex((t) => t.id === input.id)
      if (index === -1) throw new ORPCError('NOT_FOUND', { message: 'Todo not found' })
      const [deleted] = todos.splice(index, 1)
      return deleted
    }),
}
