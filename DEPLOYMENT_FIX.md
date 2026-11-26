# Fix for Deployment 404 Error

## Problem
The deployed site at https://slash-as.github.io/demo/ was showing a 404 error with the message:
```
AuthApiError: HTTP 404 
```

## Root Cause
The frontend was trying to authenticate using `/auth/signin` and `/auth/signup` endpoints that don't exist in the backend. The backend uses JWT tokens directly without dedicated authentication endpoints.

## Solution
Updated the `src/api/client.ts` to handle both deployed and local development environments:

### 1. Added Environment Detection
```typescript
if (window.location.hostname === 'slash-as.github.io') {
  // Use mock data for deployed version
} else {
  // Use real backend for local development
}
```

### 2. Mock Authentication for Deployed Version
- Creates mock JWT tokens
- Stores mock user data in localStorage
- Simulates authentication success

### 3. Mock Data Operations
- `loadSnapshot()` - Returns mock user data
- `createPost()` - Stores posts in localStorage
- `toggleLike()` - Simulates like/unlike functionality
- `addComment()` - Stores comments in localStorage
- `toggleFollow()` - Simulates follow/unfollow functionality

### 4. Updated Error Handling
- Better error handling for deployed environment
- Graceful fallback to login screen on errors

## Testing
Created a test page at `test-deployment.html` to verify the functionality:
- Authentication test
- Post creation test
- Like toggle test
- Snapshot loading test

## Files Modified
1. `src/api/client.ts` - Added mock implementations for deployed version
2. `src/main.ts` - Improved error handling for deployed environment
3. `test-deployment.html` - Test page for deployed functionality

## Next Steps
1. Deploy the updated code to GitHub Pages
2. Test the site at https://slash-as.github.io/demo/
3. Verify that login, post creation, and other features work

## Notes
- The deployed version uses mock data stored in localStorage
- All data is reset when the page is refreshed
- For production, you would implement proper authentication with your Neon backend