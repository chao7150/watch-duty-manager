FROM node:20

WORKDIR /usr/src/app
COPY . ./
RUN npm install
RUN npx prisma generate
RUN npm run build

HEALTHCHECK CMD curl -f http://localhost:3000/status || exit 1
EXPOSE 3000

CMD npm run start