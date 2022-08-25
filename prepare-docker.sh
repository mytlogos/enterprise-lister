#!/bin/bash

set -e

VERSION=$1

echo $@

if [ -z ${VERSION} ];
then
  VERSION=$(curl --silent "https://api.github.com/repos/mytlogos/enterprise-lister/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
fi

wget "https://github.com/mytlogos/enterprise-lister/releases/download/$VERSION/dist-src.zip"

unzip dist-src.zip

rm dist-src.zip

npm install -g npm@latest
npm install --production
