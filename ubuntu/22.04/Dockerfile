ARG UBUNTU_VERSION=22.04

FROM ubuntu:${UBUNTU_VERSION}

ARG DOCKER_USER=user
ARG DOCKER_HOMEDIR=/home/${DOCKER_USER}
ARG DOCKER_WORKDIR=${DOCKER_HOMEDIR}/workspace

ENV DOCKER_USER=${DOCKER_USER}
ENV DOCKER_HOMEDIR=${DOCKER_HOMEDIR}
ENV DOCKER_WORKDIR=${DOCKER_WORKDIR}

COPY ./.docker/append-history.sh /etc/profile.d/00-append-history.sh

RUN apt-get update; \
    apt-get --yes dist-upgrade; \
    apt-get --yes autoremove; \
    apt-get clean; \
    if ! id -u "${DOCKER_USER}" >/dev/null 2>&1; then \
        adduser ${DOCKER_USER} --home ${DOCKER_HOMEDIR}; \
    fi; \
    cp /etc/skel/.bashrc ${DOCKER_HOMEDIR}/.bashrc; \
    echo "source /etc/profile.d/00-append-history.sh" >> ${DOCKER_HOMEDIR}/.bashrc;

USER ${DOCKER_USER}
WORKDIR ${DOCKER_WORKDIR}
