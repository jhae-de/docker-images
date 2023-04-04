FROM ubuntu:22.04

ARG USER=electron
ARG HOMEDIR=/home/${USER}
ARG WORKDIR=${HOMEDIR}/workspace

RUN apt-get update && \
    apt-get install --yes curl wget && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    dpkg --add-architecture i386 && \
    wget -nc -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key && \
    wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources && \
    apt-get update && \
    apt-get install --yes nodejs winehq-stable libgtk-3-dev libnss3 libasound2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    if ! id -u "${USER}" >/dev/null 2>&1; then \
      adduser ${USER} --home ${HOMEDIR} --gecos "" --disabled-password; \
    fi

USER ${USER}
WORKDIR ${WORKDIR}
