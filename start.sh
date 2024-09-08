#!/bin/bash

# Function to detect whether docker-compose or docker compose is available
detect_docker_compose() {
  if command -v docker-compose &> /dev/null; then
    echo "docker-compose"
  elif docker compose version &> /dev/null; then
    echo "docker compose"
  else
    echo "Neither docker-compose nor docker compose found. Please install Docker Compose."
    exit 1
  fi
}

# Load the .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Load the .env.local file if it exists (overrides values from .env)
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Detect which docker compose command to use
DOCKER_COMPOSE=$(detect_docker_compose)

# Check the value of ALLOW_MONGO_EXPRESS and run the appropriate command
if [ "$ALLOW_MONGO_EXPRESS" = "1" ]; then
  # Make sure the network exists before running the containers
  docker network create vinted-network || true
  $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.mongo-express.yml up -d
else
  $DOCKER_COMPOSE -f docker-compose.yml up -d
fi
