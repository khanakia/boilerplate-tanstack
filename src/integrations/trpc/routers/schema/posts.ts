import { z } from 'zod'

export const getPostInputSchema = z.object({
  id: z.number(),
})
export type GetPostInput = z.infer<typeof getPostInputSchema>

export const createPostInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
})
export type CreatePostInput = z.infer<typeof createPostInputSchema>

export const updatePostInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
})
export type UpdatePostInput = z.infer<typeof updatePostInputSchema>

export const deletePostInputSchema = z.object({
  id: z.number(),
})
export type DeletePostInput = z.infer<typeof deletePostInputSchema>
