FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8000
# CMD ["npm", "run", "dev"]
# CMD ["sh", "-c", "npx wait-on tcp:db:3306 && npm run dev"]
CMD ["sh", "-c", "npx wait-on tcp:db:3306 && npm run drizzle:migrate && npm run dev"]


