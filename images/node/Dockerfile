ARG UBUNTU_VERSION=latest

FROM ghcr.io/jhae-de/ubuntu:${UBUNTU_VERSION}

ARG NODE_VERSION=lts/*
ARG NVM_VERSION=0.39.7

ENV NVM_DIR=/usr/local/nvm

USER root

RUN apt-get update; \
    apt-get --yes dist-upgrade; \
    apt-get --yes install curl; \
    mkdir -p ${NVM_DIR}; \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash; \
    . ${NVM_DIR}/nvm.sh; \
    nvm install ${NODE_VERSION}; \
    nvm alias default ${NODE_VERSION}; \
    nvm use default; \
    echo "export PATH=\${PATH}:${NVM_DIR}/versions/node/$(nvm current)/bin" > /etc/profile.d/00-export-node-path.sh; \
    echo "source /etc/profile.d/00-export-node-path.sh" >> ${DOCKER_HOMEDIR}/.bashrc; \
    apt-get --yes purge curl; \
    apt-get --yes autoremove; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*;

USER ${DOCKER_USER}
