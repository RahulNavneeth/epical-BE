FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install -g nodemon

COPY . .

RUN chmod +x "./start_server.sh"

CMD ["./start_server.sh"]
