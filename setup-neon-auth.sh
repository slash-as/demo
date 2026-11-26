#!/bin/bash

# Script to set up Neon Auth for your Nebula backend

echo "Setting up Neon Auth for Nebula backend..."

# Check if we have the Neon Auth URL
if [ -z "$1" ]; then
    echo "❌ Please provide your Neon Auth URL as the first argument"
    echo "Usage: ./setup-neon-auth.sh https://your-neon-auth-url"
    exit 1
fi

NEON_AUTH_URL="$1"
echo "Using Neon Auth URL: $NEON_AUTH_URL"

# Extract the base URL (remove /auth if present)
NEON_AUTH_BASE_URL=$(echo "$NEON_AUTH_URL" | sed 's|/auth$||')
NEON_AUTH_JWKS_URL="$NEON_AUTH_BASE_URL/jwks"

echo "NEON_AUTH_BASE_URL: $NEON_AUTH_BASE_URL"
echo "NEON_AUTH_JWKS_URL: $NEON_AUTH_JWKS_URL"

# Test the URLs
echo -e "\nTesting URLs..."

# Test JWKS endpoint
echo "Testing JWKS endpoint..."
if curl -s "$NEON_AUTH_JWKS_URL" > /dev/null; then
    echo "✅ JWKS endpoint is accessible"
else
    echo "❌ JWKS endpoint is not accessible"
    exit 1
fi

# Test health endpoint
echo "Testing health endpoint..."
if curl -s "$NEON_AUTH_BASE_URL/health" > /dev/null; then
    echo "✅ Health endpoint is accessible"
else
    echo "❌ Health endpoint is not accessible"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    touch .env
    echo "Created .env file"
fi

# Update or add environment variables
if grep -q "NEON_AUTH_BASE_URL" .env; then
    sed -i "s|NEON_AUTH_BASE_URL=.*|NEON_AUTH_BASE_URL=$NEON_AUTH_BASE_URL|" .env
    echo "Updated NEON_AUTH_BASE_URL in .env"
else
    echo "NEON_AUTH_BASE_URL=$NEON_AUTH_BASE_URL" >> .env
    echo "Added NEON_AUTH_BASE_URL to .env"
fi

if grep -q "NEON_AUTH_JWKS_URL" .env; then
    sed -i "s|NEON_AUTH_JWKS_URL=.*|NEON_AUTH_JWKS_URL=$NEON_AUTH_JWKS_URL|" .env
    echo "Updated NEON_AUTH_JWKS_URL in .env"
else
    echo "NEON_AUTH_JWKS_URL=$NEON_AUTH_JWKS_URL" >> .env
    echo "Added NEON_AUTH_JWKS_URL to .env"
fi

echo -e "\n✅ Neon Auth setup complete!"
echo "Environment variables have been added to .env file"
echo ""
echo "To use these variables, run:"
echo "  export \$(cat .env | xargs)"
echo ""
echo "Or add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
echo '  export \$(cat /path/to/your/project/.env | xargs)'