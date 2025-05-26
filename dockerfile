# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar bash y ffmpeg en builder por si es necesario (opcional)
RUN apk add --no-cache bash ffmpeg

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de la aplicación
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-alpine

WORKDIR /app

# Instalar ffmpeg en la imagen final
RUN apk add --no-cache ffmpeg

# Copiar solo los archivos necesarios desde la etapa de construcción
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Exponer el puerto (usá el mismo que tu app espera, por defecto 3000)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
