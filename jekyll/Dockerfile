ARG NODE_VERSION=latest

FROM ghcr.io/jhae-de/node:${NODE_VERSION}

ARG JEKYLL_VERSION=4.3.4
ARG BUNDLER_VERSION=2.5.23

ENV GEM_HOME=${DOCKER_HOMEDIR}/gems
ENV PATH=${PATH}:${GEM_HOME}/bin

USER root

RUN apt-get update && \
    apt-get --yes dist-upgrade && \
    apt-get --yes install build-essential git ruby-full && \
    apt-get clean

USER ${DOCKER_USER}

RUN gem install \
    jekyll:${JEKYLL_VERSION} \
    bundler:${BUNDLER_VERSION}
