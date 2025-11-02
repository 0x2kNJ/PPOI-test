FROM node:24.6.0-alpine

WORKDIR /snap

COPY .yarn/ /snap/.yarn/
COPY package.json yarn.lock .yarnrc.yml tsconfig.json /snap/
COPY packages/snap/package.json packages/snap/snap* packages/snap/tsconfig.json /snap/packages/snap/
COPY packages/snap/src/ /snap/packages/snap/src/

RUN yarn workspace snap install
RUN yarn --cwd /snap/packages/snap build

EXPOSE 8080

CMD ["yarn", "--cwd", "/snap/packages/snap", "serve"]
