FROM oven/bun:1

WORKDIR /app

# Copy application files
COPY index.html ./
COPY app.js ./
COPY styles.css ./
COPY server.ts ./

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
