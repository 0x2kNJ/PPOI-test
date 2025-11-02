FROM node:24.7.0-trixie

ARG GLOBAL_CHECKOUT_TOKEN

WORKDIR /mock-backend

COPY package*.json ./
COPY tsconfig.json ./

COPY lib/sdk/package*.json ./lib/sdk/
COPY lib/sdk/tsconfig.json ./lib/sdk/

COPY src/ src/
COPY lib/sdk/src lib/sdk/src

# update git urls so npm can download our private repositories
RUN git config --global url."https://$GLOBAL_CHECKOUT_TOKEN:x-oauth-basic@github.com/".insteadOf "https://github.com/" && \
    git config --global url."https://$GLOBAL_CHECKOUT_TOKEN:x-oauth-basic@github.com/".insteadOf "ssh://git@github.com/"

RUN npm --prefix lib/sdk ci --include=dev
RUN npm ci --include=dev

RUN npm --prefix lib/sdk run build
RUN npm run build

EXPOSE 4192

CMD ["npm", "start"]