FROM node:18.17.1

# RUN mkdir -p /github/workspace
# RUN git config --global --add safe.directory /github/workspace

RUN git --version

# nice clean home for our action files
RUN mkdir /action
WORKDIR /action

# install deps
COPY ./package.json ./package-lock.json ./
RUN npm ci --only=prod

# copy in entrypoint after dependency installation
COPY entrypoint.js .

ENTRYPOINT ["node", "/action/entrypoint.js"]
