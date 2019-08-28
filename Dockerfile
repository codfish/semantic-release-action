FROM node:10

# nice clean home for our action files
RUN mkdir /action
WORKDIR /action

# install deps
COPY ./package.json ./package-lock.json ./
RUN npm ci --only=prod

# copy in entrypoint after dependency installation
COPY entrypoint.js .

ENTRYPOINT ["node", "/action/entrypoint.js"]
