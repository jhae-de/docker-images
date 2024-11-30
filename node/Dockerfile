ARG UBUNTU_VERSION=latest

FROM ghcr.io/jhae-de/ubuntu:${UBUNTU_VERSION}

ARG NODE_VERSION=22.11.0
ARG NVM_VERSION=0.39.7

ENV NVM_DIR=/usr/local/nvm
ENV PATH=${PATH}:${NVM_DIR}/versions/node/v${NODE_VERSION}/bin

USER root

RUN apt-get update && \
    apt-get --yes dist-upgrade && \
    apt-get --yes install curl && \
    mkdir -p ${NVM_DIR} && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash && \
    . ${NVM_DIR}/nvm.sh && \
    nvm install ${NODE_VERSION} && \
    nvm alias default ${NODE_VERSION} && \
    nvm use default && \
    apt-get --yes --autoremove purge curl && \
    apt-get clean

USER ${DOCKER_USER}
