# Use the official Node.js 18 alpine image
FROM node:18-alpine

# Install dependencies needed for building native modules like canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    cairo-dev \
    pango-dev \
    giflib-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    build-base

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install node modules
RUN npm install

# Copy rest of your bot code
COPY . .

# Your bot’s entrypoint
CMD ["node", "index.js"]
