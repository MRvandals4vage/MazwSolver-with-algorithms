FROM node:20-slim

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python environment and install numpy
# We use venv in case there are externally managed environment restrictions
RUN python3 -m venv .venv
ENV PATH="/app/.venv/bin:$PATH"

# Install Python dependencies headless
RUN pip install numpy pygame

# Setup Node.js app dependencies
WORKDIR /app/web-interface
COPY web-interface/package*.json ./
RUN npm install

# Copy entire project code into the container
WORKDIR /app
COPY . .

# Build the static React dashboard page
WORKDIR /app/web-interface
RUN npm run build

# Expose port and start standard express backend serving both API & React HTML
EXPOSE 3001
CMD ["node", "server.cjs"]
