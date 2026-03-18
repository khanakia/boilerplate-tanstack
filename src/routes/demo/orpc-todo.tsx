import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/orpc-todo')({
  component: ORPCTodoPage,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      context.orpc.todos.list.queryOptions(),
    )
  },
})

function ORPCTodoPage() {
  const { orpc } = Route.useRouteContext()
  const [todo, setTodo] = useState('')

  const { data: todos, refetch } = useQuery(orpc.todos.list.queryOptions())

  const { mutate: addTodo } = useMutation({
    ...orpc.todos.add.mutationOptions(),
    onSuccess: () => {
      refetch()
      setTodo('')
    },
  })

  const { mutate: toggleTodo } = useMutation({
    ...orpc.todos.toggle.mutationOptions(),
    onSuccess: () => refetch(),
  })

  const { mutate: deleteTodo } = useMutation({
    ...orpc.todos.delete.mutationOptions(),
    onSuccess: () => refetch(),
  })

  return (
    <div className="max-w-md mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold mb-4">oRPC Todo Demo</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={todo}
          onChange={(e) => setTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && todo.trim()) addTodo({ name: todo })
          }}
          placeholder="Add a todo..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          type="button"
          onClick={() => {
            if (todo.trim()) addTodo({ name: todo })
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add
        </button>
      </div>

      <ul className="space-y-2">
        {todos?.map((t) => (
          <li key={t.id} className="flex items-center gap-2 p-2 border rounded-md">
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => toggleTodo({ id: t.id })}
              className="h-4 w-4"
            />
            <span className={`flex-1 ${t.completed ? 'line-through text-gray-400' : ''}`}>
              {t.name}
            </span>
            <button
              type="button"
              onClick={() => deleteTodo({ id: t.id })}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
