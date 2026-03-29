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
# Use production config by default (SPA only, no backend proxy)
# ALB handles /api/* and /media/* routing to the backend
COPY nginx.conf.production /etc/nginx/conf.d/default.conf
# Copy the built React app from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
