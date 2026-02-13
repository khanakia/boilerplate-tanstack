// GraphQL fetcher for generated React Query hooks.
// Customize the endpoint URL and headers (e.g. auth tokens) to match your API.

const GRAPHQL_ENDPOINT = "http://localhost:4000/graphql";

export function useFetchData<TData, TVariables>(
  query: string,
): (variables?: TVariables) => Promise<TData> {
  return async (variables?: TVariables) => {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // TODO: Add auth headers here, e.g.:
        // "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();

    if (json.errors) {
      const message = json.errors
        .map((e: { message: string }) => e.message)
        .join("\n");
      throw new Error(message);
    }

    return json.data as TData;
  };
}
