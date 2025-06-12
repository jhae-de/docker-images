include .env
export

PROJECT_NAME ?= JHAE Docker images
COMPOSE_PROJECT_NAME ?= $(shell echo $(PROJECT_NAME) | sed 's/\(.*\)/\L\1/;s/[^[:alnum:]_-]/-/g')

.DEFAULT_GOAL := help
TARGET_DESCRIPTION_INDENTATION := 24

.PHONY: help
help: ## Display this help
	@printf "\n\033[1m$(shell echo $(PROJECT_NAME))\033[0m\n\n\033[33mUsage:\033[0m\n  make [target]\n\n\033[33mTargets:\033[0m\n"
	@awk 'BEGIN {FS = ":.*?## "} \
		/^[^#[:space:]]+:.*?## / { \
			if (section) { \
				printf "\n  \033[33m%*s\033[0m\n", 2, section; \
				section = ""; \
			} \
			printf "  \033[34m%-$(TARGET_DESCRIPTION_INDENTATION)s\033[0m %s\n", $$1, $$2; \
		} \
		/^#[[:space:]]*[A-Z ]+[[:space:]]TARGETS/ { \
			sub(/^#[[:space:]]*/, ""); \
			section = $$0; \
		}' $(firstword $(MAKEFILE_LIST))

# APP TARGETS
.PHONY: app-bash
app-bash: start ## Access the app container
	@docker compose exec app bash

.PHONY: app-fix
app-fix: start ## Automatically fix, where possible, problems in the source code
	@docker compose exec app bash -c 'npm run-script fix'

.PHONY: app-install
app-install: docker-pull start ## Install the dependencies
	@docker compose exec app bash -c 'npm install'

.PHONY: app-lint
app-lint: start ## Run linters
	@docker compose exec app bash -c 'npm run-script lint'

.PHONY: app-test
app-test: start ## Run tests
	@docker compose exec app bash -c 'npm run-script test'

.PHONY: app-test-coverage
app-test-coverage: start ## Run tests with coverage report
	@docker compose exec app bash -c 'npm run-script test:coverage'

.PHONY: app-test-watch
app-test-watch: start ## Run tests and watch file changes
	@docker compose exec app bash -c 'npm run-script test:watch'

.PHONY: app-test-watch-coverage
app-test-watch-coverage: start ## Run tests with coverage report and watch file changes
	@docker compose exec app bash -c 'npm run-script test:watch:coverage'

# DOCKER TARGETS
.PHONY: docker-destroy
docker-destroy: ## Remove the docker containers, images without a custom tag, volumes and orphans
	@docker compose down --rmi local --volumes --remove-orphans

.PHONY: docker-logs
docker-logs: ## Follow the output of the docker container logs
	@docker compose logs --follow

.PHONY: docker-pull
docker-pull: ## Pull the docker service images
	@docker compose pull

.PHONY: docker-status
docker-status: ## List the status of the docker containers
	@docker compose ps --all

# START AND STOP TARGETS
.PHONY: start
start: ## Start the docker containers
	@docker compose up --detach --remove-orphans --wait

.PHONY: stop
stop: ## Stop the docker containers
	@docker compose down --remove-orphans
