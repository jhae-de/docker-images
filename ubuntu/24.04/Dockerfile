ARG UBUNTU_VERSION=24.04

FROM ubuntu:${UBUNTU_VERSION}

ARG DOCKER_USER=user
ARG DOCKER_HOMEDIR=/home/${DOCKER_USER}
ARG DOCKER_WORKDIR=${DOCKER_HOMEDIR}/workspace

ENV DOCKER_USER=${DOCKER_USER}
ENV DOCKER_HOMEDIR=${DOCKER_HOMEDIR}
ENV DOCKER_WORKDIR=${DOCKER_WORKDIR}

RUN apt-get update; \
    apt-get --yes dist-upgrade; \
    if ! id -u "${DOCKER_USER}" >/dev/null 2>&1; then \
        apt-get --yes install adduser perl; \
        deluser --remove-home ubuntu; \
        adduser ${DOCKER_USER} --home ${DOCKER_HOMEDIR}; \
        apt-get --yes purge adduser perl; \
    fi; \
    apt-get --yes autoremove; \
    apt-get clean;

COPY ./.docker/append-history.sh /etc/profile.d/00-append-history.sh

USER ${DOCKER_USER}
WORKDIR ${DOCKER_WORKDIR}

RUN echo "alias ll='ls -alF'" >> ${DOCKER_HOMEDIR}/.bash_aliases; \
    echo "alias la='ls -A'" >> ${DOCKER_HOMEDIR}/.bash_aliases; \
    echo "alias l='ls -CF'" >> ${DOCKER_HOMEDIR}/.bash_aliases;
