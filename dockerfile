# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar bash y ffmpeg para posibles dependencias en build
RUN apk add --no-cache bash ffmpeg

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

# Copiar el resto del código fuente y construir la app
COPY . .
RUN npm run build

# Etapa de producción
FROM node:20-alpine

WORKDIR /app

# Instalar ffmpeg en el contenedor final (porque acá es donde corre)
RUN apk add --no-cache ffmpeg

# Copiar solo lo necesario desde la etapa de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# ⚠️ Copiar también la fuente y prisma client generado
COPY --from=builder /app/Roboto-Regular.ttf ./Roboto-Regular.ttf
COPY --from=builder /app/prisma ./prisma  # <-- si tu código accede a schema en runtime

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la app
CMD ["npm", "start"]
