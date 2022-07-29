#!/bin/bash

set -e

VERSION=$(git describe --tags)

echo $@

wget "https://github.com/mytlogos/enterprise-lister/releases/download/$VERSION/dist-src.zip"

unzip dist-src.zip

rm dist-src.zip

npm install -g npm@latest
npm install --production
