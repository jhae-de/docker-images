# Docker Images

## Ubuntu

Package: [ubuntu](https://github.com/jhae-de/docker-images/pkgs/container/ubuntu)  
Ubuntu website: https://ubuntu.com

| Version | Description                          |
|---------|--------------------------------------|
| latest  | The latest Ubuntu LTS version        |
| 24.04   | Ubuntu 24.04.* LTS (Noble Numbat)    |
| 22.04   | Ubuntu 22.04.* LTS (Jammy Jellyfish) |

Build a specific version by running the
[Ubuntu workflow](https://github.com/jhae-de/docker-images/actions/workflows/ubuntu.yaml).  
Build all versions by running the
[Ubuntu Matrix workflow](https://github.com/jhae-de/docker-images/actions/workflows/ubuntu-matrix.yaml).

***

## Node

Image with preinstalled Node based on Ubuntu.

Package: [node](https://github.com/jhae-de/docker-images/pkgs/container/node)  
Node website: https://nodejs.org

| Version  | Description             | Base image                           |
|----------|-------------------------|--------------------------------------|
| latest   | The latest Node version | Ubuntu LTS (latest)                  |
| xx       | A specific Node version | Ubuntu LTS (latest)                  |
| noble    | The latest Node version | Ubuntu 24.04.* LTS (Noble Numbat)    |
| xx-noble | A specific Node version | Ubuntu 24.04.* LTS (Noble Numbat)    |
| jammy    | The latest Node version | Ubuntu 22.04.* LTS (Jammy Jellyfish) |
| xx-jammy | A specific Node version | Ubuntu 22.04.* LTS (Jammy Jellyfish) |

Build a specific version by running the
[Node workflow](https://github.com/jhae-de/docker-images/actions/workflows/node.yaml).  
Build all versions by running the
[Node Matrix workflow](https://github.com/jhae-de/docker-images/actions/workflows/node-matrix.yaml).

***

## Jekyll

Image with preinstalled Node, Jekyll and Bundler based on Ubuntu.

Package: [jekyll](https://github.com/jhae-de/docker-images/pkgs/container/jekyll)  
Jekyll website: https://jekyllrb.com  
Bundler website: https://bundler.io

| Version  | Description               | Base image  |
|----------|---------------------------|-------------|
| latest   | The latest Jekyll version | Node latest |
| x.x.x    | A specific Jekyll version | Node latest |
| x.x.x-xx | A specific Jekyll version | Node xx     |

Build a specific version by running the
[Jekyll workflow](https://github.com/jhae-de/docker-images/actions/workflows/jekyll.yaml).  
Build all versions by running the
[Jekyll Matrix workflow](https://github.com/jhae-de/docker-images/actions/workflows/jekyll-matrix.yaml).
