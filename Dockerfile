FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY ./dist /var/www/html
