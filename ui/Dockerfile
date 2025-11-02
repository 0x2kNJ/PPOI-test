FROM nginx:1.29.1-alpine

# The dist folder must be prebuilt on the host with `npm run build` because we 
# cannot easily give the container access to our private sdk repo.
ADD ./dist /usr/share/nginx/html

# Configuring self-signed TLS to enable SharedArrayBuffer in the browser
# because bb.js needs SharedArrayBuffer for multithreading, see
# https://www.npmjs.com/package/@aztec/bb.js and
# https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements
ADD ./nginx/certs /etc/nginx/ssl
COPY ./nginx/baanx.demo.conf /etc/nginx/conf.d/default.conf