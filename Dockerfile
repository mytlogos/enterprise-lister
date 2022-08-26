# syntax=docker/dockerfile:1
FROM node:18
ARG PROJECT_VERSION

RUN apt update && apt install -y chromium && apt-get clean
RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN export PUPPETEER_EXECUTABLE_PATH=$(which chromium)

WORKDIR /code
COPY prepare-docker.sh ./
# download release and install dependencies
RUN /bin/bash ./prepare-docker.sh $PROJECT_VERSION
COPY *.env ./
