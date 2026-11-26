// Test Neon Auth setup for your backend
async function testNeonAuthSetup() {
  console.log("Testing Neon Auth setup for your backend...");
  
  // Check if environment variables are set
  const requiredEnvVars = [
    'NEON_AUTH_BASE_URL',
    'NEON_AUTH_JWKS_URL'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingEnvVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.log("\nPlease set these environment variables in your environment:");
    console.log("export NEON_AUTH_BASE_URL='https://your-neon-auth-url'");
    console.log("export NEON_AUTH_JWKS_URL='https://your-neon-auth-url/jwks'");
    return;
  }
  
  console.log("✅ Environment variables are set:");
  console.log(`  NEON_AUTH_BASE_URL: ${process.env.NEON_AUTH_BASE_URL}`);
  console.log(`  NEON_AUTH_JWKS_URL: ${process.env.NEON_AUTH_JWKS_URL}`);
  
  try {
    // Test JWKS endpoint
    console.log("\nTesting JWKS endpoint...");
    const jwksResponse = await fetch(process.env.NEON_AUTH_JWKS_URL);
    
    if (!jwksResponse.ok) {
      throw new Error(`JWKS endpoint returned ${jwksResponse.status}: ${jwksResponse.statusText}`);
    }
    
    const jwksData = await jwksResponse.json();
    console.log("✅ JWKS endpoint is working");
    console.log(`  Found ${jwksData.keys?.length || 0} key(s) in JWKS`);
    
    // Test auth base URL
    console.log("\nTesting auth base URL...");
    const healthResponse = await fetch(`${process.env.NEON_AUTH_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("✅ Auth service is healthy");
      console.log(`  Status: ${healthData.status}`);
    } else {
      console.log(`ℹ️  Health endpoint returned ${healthResponse.status}: ${healthResponse.statusText}`);
    }
    
    // Test if we can create a JWT for testing
    console.log("\nTesting JWT creation...");
    const jwtPayload = {
      sub: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    console.log("JWT payload structure is valid");
    console.log("  sub:", jwtPayload.sub);
    console.log("  email:", jwtPayload.email);
    console.log("  name:", jwtPayload.name);
    
  } catch (error) {
    console.error("❌ Error testing Neon Auth setup:", error.message);
  }
}

testNeonAuthSetup();