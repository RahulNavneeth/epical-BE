#!/bin/bash

PORTS=(1212 1313 1414 1515)

for port in "${PORTS[@]}"; do
    echo "Starting server on port $port"
    PORT=$port npm start &
done

wait
