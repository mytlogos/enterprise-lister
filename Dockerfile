# syntax=docker/dockerfile:1
FROM node:16.3

# INFO: force all container to have german timezone
# reason: for (wrong) reasons the dates in the database are interpreted
# and used as local datetimes
RUN npm -g install npm@latest
RUN npm -g install @vue/cli typescript

