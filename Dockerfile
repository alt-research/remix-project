# This dockerfile is to build each branch seperately (for dev purposes)
FROM node:14 as build-stage
# Create Remix user, don't use root!
# RUN yes | adduser --disabled-password remix && mkdir /app
# USER remix

# #Now do remix stuff
# USER remix
WORKDIR /home/remix

COPY ./ ./

RUN yarn global add nx
RUN yarn install
RUN yarn run build:libs
RUN nx build
RUN yarn run build:production

FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /home/remix/dist/apps/remix-ide /usr/share/nginx/html/
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
