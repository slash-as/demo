#!/bin/bash

# Script to set up Neon environment variables for your Nebula project

echo "Setting up Neon environment variables for Nebula..."

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your Neon API key as the first argument"
    echo "Usage: ./setup-neon-env.sh YOUR_API_KEY"
    exit 1
fi

NEON_API_KEY="$1"
echo "Using Neon API Key: ${NEON_API_KEY:0:10}..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    touch .env
    echo "Created .env file"
fi

# Update or add environment variables
if grep -q "NEON_API_KEY" .env; then
    sed -i "s|NEON_API_KEY=.*|NEON_API_KEY=$NEON_API_KEY|" .env
    echo "Updated NEON_API_KEY in .env"
else
    echo "NEON_API_KEY=$NEON_API_KEY" >> .env
    echo "Added NEON_API_KEY to .env"
fi

# Add other required environment variables for your backend
echo ""
echo "Adding other required environment variables..."

# Database connection (you'll need to get these from your Neon project)
echo "Please add your Neon database connection string to .env:"
echo "  DATABASE_URL='postgresql://user:password@host:port/database'"
echo ""
echo "You can find this in your Neon project dashboard under Connection Details"

# Neon Auth (if using Neon Auth for authentication)
echo "If using Neon Auth, add these to .env:"
echo "  NEON_AUTH_BASE_URL='https://your-neon-auth-url'"
echo "  NEON_AUTH_JWKS_URL='https://your-neon-auth-url/jwks'"

# Neon Object Storage (if using for file uploads)
echo "If using Neon Object Storage, add this to .env:"
echo "  NEON_STORAGE_BUCKET='your-bucket-name'"

# Realtime (if using Neon Realtime)
echo "If using Neon Realtime, add this to .env:"
echo "  NEON_REALTIME_SECRET='your-realtime-secret'"

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "To load these variables, run:"
echo "  export \$(cat .env | xargs)"
echo ""
echo "Or add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
echo '  export \$(cat /path/to/your/project/.env | xargs)'