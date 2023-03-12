FROM ghcr.io/jhae-de/android-sdk-tools:1.0.0

ARG ANDROID_SDK_BUILD_TOOLS_VERSION=33.0.2
ARG ANDROID_SDK_PLATFORM_VERSION=33

RUN yes | sdkmanager \
    "build-tools;${ANDROID_SDK_BUILD_TOOLS_VERSION}" \
    "platforms;android-${ANDROID_SDK_PLATFORM_VERSION}"
