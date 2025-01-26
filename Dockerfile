FROM oven/bun:latest
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=th_TH.utf8 \
    TZ=Asia/Bangkok
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
CMD ["bun", "run", "src/index.ts"]
