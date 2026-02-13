import { TRPCError } from '@trpc/server'
import type { TRPCRouterRecord } from '@trpc/server'
import { publicProcedure } from '../procedures'
import {
  getPostInputSchema,
  createPostInputSchema,
  updatePostInputSchema,
  deletePostInputSchema,
} from './schema/posts'

interface Post {
  id: number
  title: string
  content: string
  createdAt: Date
}

const posts: Post[] = [
  {
    id: 1,
    title: 'Getting Started with tRPC',
    content: 'tRPC allows you to build fully typesafe APIs without schemas or code generation.',
    createdAt: new Date('2025-01-15'),
  },
  {
    id: 2,
    title: 'Why TanStack Start?',
    content: 'TanStack Start is a full-stack React framework powered by TanStack Router.',
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 3,
    title: 'Drizzle ORM Deep Dive',
    content: 'Drizzle ORM provides a typesafe and performant way to interact with your database.',
    createdAt: new Date('2025-03-10'),
  },
]

let nextId = 4

export const postsRouter = {
  list: publicProcedure.query(() => posts),

  get: publicProcedure
    .input(getPostInputSchema)
    .query(({ input }) => {
      const post = posts.find((p) => p.id === input.id)
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      return post
    }),

  create: publicProcedure
    .input(createPostInputSchema)
    .mutation(({ input }) => {
      const newPost: Post = {
        id: nextId++,
        title: input.title,
        content: input.content,
        createdAt: new Date(),
      }
      posts.push(newPost)
      return newPost
    }),

  update: publicProcedure
    .input(updatePostInputSchema)
    .mutation(({ input }) => {
      const post = posts.find((p) => p.id === input.id)
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      if (input.title) post.title = input.title
      if (input.content) post.content = input.content
      return post
    }),

  delete: publicProcedure
    .input(deletePostInputSchema)
    .mutation(({ input }) => {
      const index = posts.findIndex((p) => p.id === input.id)
      if (index === -1) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' })
      const [deleted] = posts.splice(index, 1)
      return deleted
    }),
} satisfies TRPCRouterRecord
