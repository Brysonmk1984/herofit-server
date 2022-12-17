#This is the PROD Dockerfile
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY tsconfig.prod.json ./
COPY src ./src

RUN npm install --omit=dev 
RUN npm run herofit-prod-build


## this is stage two , where the app actually runs
FROM node:16
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev --only=production
COPY --from=0 /usr/src/app/build .
ENV NODE_ENV=production
#RUN npm install pm2 -g
EXPOSE 3001
#CMD ["pm2-runtime","app.js"]
CMD [ "node", "start.js" ]


