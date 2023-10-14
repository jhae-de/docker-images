ARG UBUNTU_VERSION=22.04

FROM ghcr.io/jhae-de/ubuntu:${UBUNTU_VERSION}

ARG NVM_VERSION=0.39.5
ARG NODE_VERSION=18.18.2

ENV NVM_DIR=/usr/local/nvm
ENV PATH=${PATH}:${NVM_DIR}/versions/node/v${NODE_VERSION}/bin

USER root

RUN apt-get update && \
    apt-get dist-upgrade --yes && \
    apt-get install --yes curl && \
    mkdir -p ${NVM_DIR} && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash && \
    . ${NVM_DIR}/nvm.sh && \
    nvm install ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION} && \
    nvm use default && \
    apt-get purge --yes curl && \
    apt-get clean

USER ${DOCKER_USER}
