#!/bin/sh
# Stripe webhook local setup.
# Captures the ephemeral whsec_... from stripe-cli and writes it to .env.
# Run once after setting STRIPE_SECRET_KEY in .env, then docker compose up -d --build.
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example and add your Stripe keys first."
  exit 1
fi

if ! grep -q '^STRIPE_SECRET_KEY=sk_test_' .env; then
  echo "STRIPE_SECRET_KEY must start with sk_test_ in .env"
  exit 1
fi

if grep -q '^STRIPE_WEBHOOK_SECRET=' .env && [ -n "$(grep '^STRIPE_WEBHOOK_SECRET=' .env | cut -d= -f2)" ]; then
  echo "STRIPE_WEBHOOK_SECRET is already set in .env."
  echo "Remove it and re-run this script to rotate, or leave it as-is."
  exit 0
fi

echo "Starting stripe-cli..."
docker compose up -d stripe-cli

echo "Waiting for signing secret..."
sleep 3
SECRET=$(docker compose logs stripe-cli 2>&1 | grep -o 'whsec_[a-f0-9]*' | tail -1)

if [ -z "$SECRET" ]; then
  echo "Could not capture signing secret."
  echo "Run manually: docker compose logs stripe-cli"
  exit 1
fi

sed -i '' "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$SECRET|" .env
echo "STRIPE_WEBHOOK_SECRET=$SECRET"

echo "Recreating api with new secret..."
docker compose up -d --force-recreate api

echo ""
echo "Done. Stripe webhook is now configured: $SECRET"
