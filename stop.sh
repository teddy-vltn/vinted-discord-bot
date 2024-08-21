#!/bin/bash

# Load the .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Load the .env.local file if it exists (overrides values from .env)
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check the value of ALLOW_MONGO_EXPRESS and run the appropriate docker-compose command
if [ "$ALLOW_MONGO_EXPRESS" = "1" ]; then
  docker-compose -f docker-compose.yml -f docker-compose.mongo-express.yml down
else
  docker-compose -f docker-compose.yml down
fi

# Optionally, you can remove the network if it's no longer needed
docker network rm vinted-network
