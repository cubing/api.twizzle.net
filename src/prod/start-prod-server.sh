#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"
cd ../../

echo "Restarting prod server."

# TODO: This assumes the repo dir is in the home dir.
# We should store secrets more robustly.
TWIZZLE_WCA_APPLICATION_CLIENT_SECRET=$(cat ../secrets/TWIZZLE_WCA_APPLICATION_CLIENT_SECRET.txt)
export TWIZZLE_WCA_APPLICATION_CLIENT_SECRET

echo "Starting server."
make prod
