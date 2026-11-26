// Test Neon Auth integration
async function testNeonAuthIntegration() {
  const authUrl = "https://ep-sweet-pond-bh26q3q1.neonauth.c-10.eu-central-1.aws.neon.tech/neondb/auth";
  
  console.log("Testing Neon Auth integration...");
  console.log("Auth URL:", authUrl);
  
  try {
    // Test basic connectivity to the Neon Auth endpoint
    const response = await fetch(`${authUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("✅ Neon Auth status:", data);
    
    // Test if we can get the configuration
    const configResponse = await fetch(`${authUrl}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log("✅ Neon Auth configuration:", {
        version: config.version,
        providers: config.providers?.map(p => p.type) || [],
        emailAndPassword: config.emailAndPassword?.enabled ? 'enabled' : 'disabled'
      });
    } else {
      console.log("ℹ️  Could not retrieve configuration (might require authentication)");
    }
    
  } catch (error) {
    console.error("Error testing Neon Auth integration:", error.message);
  }
}

testNeonAuthIntegration();