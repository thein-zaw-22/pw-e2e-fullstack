# Multi-stage build: first build the React app, then serve with Nginx

# Stage 1: Build the React application
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the built files with Nginx
FROM nginx:alpine
# Copy our custom nginx config (static for local dev)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the template (for ECS/production with dynamic backend URL)
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
# Copy the entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
# Copy the built React app from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Default: use static nginx.conf (works with docker-compose where backend=hostname)
# For ECS: override CMD with /docker-entrypoint.sh to use template with env vars
CMD ["nginx", "-g", "daemon off;"]
