FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
# CMD ["sh", "-c", "npx wait-on tcp:db:3306 && npm run dev"]
