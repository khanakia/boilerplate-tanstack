import { z } from 'zod'

export const addTodoInputSchema = z.object({
  name: z.string().min(1, 'Todo name is required'),
})
export type AddTodoInput = z.infer<typeof addTodoInputSchema>

export const toggleTodoInputSchema = z.object({
  id: z.number(),
})
export type ToggleTodoInput = z.infer<typeof toggleTodoInputSchema>

export const deleteTodoInputSchema = z.object({
  id: z.number(),
})
export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>
