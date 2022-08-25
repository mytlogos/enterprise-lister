# syntax=docker/dockerfile:1
FROM node:18
ARG PROJECT_VERSION

WORKDIR /code
COPY prepare-docker.sh ./
# download release and install dependencies
RUN /bin/bash ./prepare-docker.sh $PROJECT_VERSION
COPY *.env ./
