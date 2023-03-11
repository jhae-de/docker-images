FROM ubuntu:22.04

LABEL org.opencontainers.image.source=https://github.com/jhae-de/docker-images \
      org.opencontainers.image.licenses=MIT

# See https://developer.android.com/studio/#command-tools
ARG ANDROID_SDK_CMDLINE_TOOLS_VERSION=9477386

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

RUN cd /opt && \
    apt-get update && \
    apt-get install -y openjdk-17-jdk unzip wget && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_CMDLINE_TOOLS_VERSION}_latest.zip -O android-sdk-cmdline-tools.zip && \
    mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    unzip android-sdk-cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm android-sdk-cmdline-tools.zip && \
    yes | sdkmanager --licenses && \
    sdkmanager platform-tools
