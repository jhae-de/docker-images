FROM ghcr.io/jhae-de/node:latest

ARG JEKYLL_VERSION=4.3.3
ARG BUNDLER_VERSION=2.5.17

ENV GEM_HOME=${DOCKER_HOMEDIR}/gems
ENV PATH=${PATH}:${GEM_HOME}/bin

USER root

RUN apt-get update && \
    apt-get dist-upgrade --yes && \
    apt-get install --yes ruby-full build-essential git && \
    apt-get clean

USER ${DOCKER_USER}

RUN gem install \
    jekyll:${JEKYLL_VERSION} \
    bundler:${BUNDLER_VERSION}
