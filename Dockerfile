FROM node:20.12.1-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

# nice clean home for our action files
RUN mkdir /action
WORKDIR /action

# install deps
COPY ./package.json ./package-lock.json ./
RUN npm ci --only=prod

# copy in entrypoint after dependency installation
COPY entrypoint.js .

ENTRYPOINT ["node", "/action/entrypoint.js"]
