FROM node:18-alpine

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

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "server.js"]
