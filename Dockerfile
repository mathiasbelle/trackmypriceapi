# Base para desenvolvimento e produção
FROM node:23 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS development
RUN npm install --only=development
CMD ["npm", "run", "start:dev"]


FROM base AS debug
RUN npm install --only=development
CMD ["npm", "run", "start:debug"]


FROM base AS production
RUN npm install --only=production
#RUN npm run start
#CMD ["node", "dist/main"]
CMD ["npm", "run", "start"]
