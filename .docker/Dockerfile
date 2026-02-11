FROM node:22-alpine
RUN npm i -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm i

ARG PORT=3000
ENV PORT=$PORT
ENV VITE_PORT=$PORT
# Ensure host is 0.0.0.0 for external access
ENV VITE_HOST=0.0.0.0

EXPOSE $PORT

# Override the dev command to ensure host binding
CMD ["sh", "-c", "NODE_OPTIONS='--import ./instrument.server.mjs' pnpm vite dev --port $PORT --host"]
