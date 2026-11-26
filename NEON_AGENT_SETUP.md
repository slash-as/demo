# Neon Agent Setup Guide

This guide will help you set up your Nebula application to work with Neon Auth.

## Prerequisites

1. You need a Neon account with a project configured
2. You need to have Neon Auth enabled in your Neon project
3. You need the Neon Auth URL for your project

## Step 1: Get Your Neon Auth URL

The Neon Auth URL should be in the format:
```
https://ep-sweet-pond-bh26q3q1.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth
```

## Step 2: Set Up Environment Variables

Run the setup script with your Neon Auth URL:

```bash
./setup-neon-auth.sh https://ep-sweet-pond-bh26q3q1.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth
```

This will:
1. Extract the base URL and JWKS URL
2. Test if the endpoints are accessible
3. Create or update a `.env` file with the required variables

## Step 3: Test the Setup

Run the test script to verify everything is working:

```bash
node test-neon-auth-setup.js
```

## Step 4: Set Up Frontend Authentication

Your frontend needs to be configured to use Neon Auth. Update your `src/api/client.ts` to use the correct authentication flow:

```typescript
// In your API client, make sure to use the correct Neon Auth endpoints
const neonAuthUrl = process.env.NEON_AUTH_BASE_URL || 'https://your-neon-auth-url';
```

## Step 5: Test Authentication Flow

1. Start your backend server
2. Try to access a protected endpoint (e.g., `/bootstrap`)
3. You should get a 401 Unauthorized response
4. After authenticating with Neon Auth, you should get a 200 response with user data

## Step 6: Configure Your IDE/Editor

If you're using VS Code or another editor, make sure to load the environment variables:

```bash
# For VS Code
export \$(cat .env | xargs)

# Or add to your shell profile
echo 'export \$(cat /path/to/your/project/.env | xargs)' >> ~/.bashrc
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that your JWT token is properly formatted and includes the required claims
2. **JWKS endpoint not found**: Verify your `NEON_AUTH_JWKS_URL` is correct
3. **CORS issues**: Make sure your frontend origin is in the allowed origins list

### Debug Commands

```bash
# Test JWKS endpoint
curl https://your-neon-auth-url/jwks

# Test health endpoint
curl https://your-neon-auth-url/health

# Test backend health
curl http://localhost:3000/health
```

## Next Steps

1. Set up user registration and login in your frontend
2. Implement JWT token storage and refresh
3. Add error handling for authentication failures
4. Set up email/password or OAuth providers if needed

## Additional Resources

- [Neon Auth Documentation](https://neon.com/docs/guides/auth)
- [Better Auth Documentation](https://better-auth.com/docs)
- [JWT Verification Guide](https://neon.com/docs/guides/jwt-verification)