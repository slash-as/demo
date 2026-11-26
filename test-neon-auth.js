import { createNeonClient } from "@neon/sdk";

// Test Neon SDK authentication
async function testNeonAuth() {
  // For security, the API key should be provided via environment variable or command line
  const apiKey = process.env.NEON_API_KEY || process.argv[2] || "napi_q6pczvxyu0nd8c0gfu0ss0vxemdfyxzcxz1q6c002d8g18ux7sta1vxhfxo56r35";
  
  if (!apiKey) {
    console.error("Neon API key is required");
    console.log("Usage:");
    console.log("  node test-neon-auth.js YOUR_API_KEY");
    console.log("  or");
    console.log("  export NEON_API_KEY='your-api-key-here'");
    console.log("  node test-neon-auth.js");
    return;
  }
  
  console.log("Testing Neon SDK authentication...");
  
  try {
    const neon = createNeonClient({ apiKey });
    
    // Test getting user info
    const { data, error } = await neon.user.me();
    
    if (error) {
      console.error("Authentication failed:", error.message);
      console.log("Error details:", {
        kind: error.kind,
        status: error.status,
        code: error.code,
        requestId: error.requestId
      });
      return;
    }
    
    console.log("✅ Authentication successful!");
    console.log("User info:", {
      email: data.email,
      name: data.name,
      id: data.id
    });
    
    // Test getting organizations
    try {
      // First try to get organizations with the correct method
      const { data: orgs, error: orgsError } = await neon.user.organizations();
      
      if (orgsError) {
        console.error("Failed to get organizations:", orgsError.message);
        
        // Try alternative method
        try {
          const { data: altOrgs, error: altError } = await neon.organizations.list();
          if (altError) {
            console.error("Alternative org method also failed:", altError.message);
          } else {
            console.log("Organizations (alternative method):", altOrgs.map(org => ({
              name: org.name,
              id: org.id
            })));
          }
        } catch (altError) {
          console.error("Error with alternative org method:", altError.message);
        }
      } else {
        console.log("Organizations:", orgs.map(org => ({
          name: org.name,
          id: org.id,
          role: org.role
        })));
      }
    } catch (error) {
      console.error("Error getting organizations:", error.message);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testNeonAuth();