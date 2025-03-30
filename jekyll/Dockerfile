ARG NODE_VERSION=latest

FROM ghcr.io/jhae-de/node:${NODE_VERSION}

ARG BUNDLER_VERSION=2.5.23
ARG JEKYLL_VERSION=4.3.4

ENV GEM_HOME=${DOCKER_HOMEDIR}/gems
ENV PATH=${PATH}:${GEM_HOME}/bin

USER root

RUN apt-get update; \
    apt-get --yes dist-upgrade; \
    apt-get --yes install build-essential git ruby-full; \
    apt-get --yes autoremove; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*;

USER ${DOCKER_USER}

RUN gem install \
    bundler:${BUNDLER_VERSION} \
    jekyll:${JEKYLL_VERSION}
