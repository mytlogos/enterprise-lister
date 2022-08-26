# syntax=docker/dockerfile:1
FROM node:18-alpine
ARG PROJECT_VERSION

RUN apk add --no-cache chromium wget curl grep unzip
RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN export PUPPETEER_EXECUTABLE_PATH=$(which chromium)

WORKDIR /code
COPY prepare-docker.sh ./
# download release and install dependencies
RUN /bin/sh ./prepare-docker.sh $PROJECT_VERSION
COPY *.env ./
