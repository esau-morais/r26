FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY src/ ./src/
RUN mkdir -p /app/data

EXPOSE 3026
CMD ["bun", "run", "src/server.ts"]
