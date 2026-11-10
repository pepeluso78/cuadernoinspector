# Etapa 1: Compilar el proyecto Vite/React de Lovable
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite leerá automáticamente tu archivo .env al hacer el build
RUN npm run build

# Etapa 2: Servidor web ligero Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
