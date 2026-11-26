import { createNeonClient } from "@neon/sdk";

// Comprehensive Neon SDK test
async function comprehensiveNeonTest() {
  // Use the provided API key
  const apiKey = "napi_q6pczvxyu0nd8c0gfu0ss0vxemdfyxzcxz1q6c002d8g18ux7sta1vxhfxo56r35";
  
  console.log("🚀 Starting comprehensive Neon SDK test...");
  console.log("API Key:", apiKey.substring(0, 10) + "...");
  
  try {
    const neon = createNeonClient({ apiKey });
    
    // Test 1: Get user info
    console.log("\n📋 Test 1: Getting user info...");
    const { data: user, error: userError } = await neon.user.me();
    
    if (userError) {
      console.error("❌ Failed to get user info:", userError.message);
      return;
    }
    
    console.log("✅ User info:", {
      email: user.email,
      name: user.name,
      id: user.id
    });
    
    // Test 2: Get organizations
    console.log("\n🏢 Test 2: Getting organizations...");
    const { data: orgs, error: orgsError } = await neon.user.organizations();
    
    if (orgsError) {
      console.error("❌ Failed to get organizations:", orgsError.message);
      return;
    } else if (orgs && orgs.length > 0) {
      console.log("✅ Organizations:", orgs.map(org => ({
        name: org.name,
        id: org.id,
        role: org.role
      })));
      
      // Use the first organization for further tests
      const org = orgs[0];
      console.log(`\n🔧 Using organization: ${org.name} (${org.id})`);
      
      // Test 3: Get projects
      console.log("\n📁 Test 3: Getting projects...");
      const { data: projects, error: projectsError } = await neon.projects.list({
        orgId: org.id
      });
      
      if (projectsError) {
        console.error("❌ Failed to get projects:", projectsError.message);
      } else if (projects && projects.length > 0) {
        console.log("✅ Projects:", projects.map(project => ({
          name: project.name,
          id: project.id,
          region: project.region_id,
          status: project.status
        })));
        
        // Use the first project for further tests
        const project = projects[0];
        console.log(`\n🌐 Using project: ${project.name} (${project.id})`);
        
        // Test 4: Get branches
        console.log("\n🌿 Test 4: Getting branches...");
        const { data: branches, error: branchesError } = await neon.branches.list({
          projectId: project.id
        });
        
        if (branchesError) {
          console.error("❌ Failed to get branches:", branchesError.message);
        } else if (branches && branches.length > 0) {
          console.log("✅ Branches:", branches.map(branch => ({
            name: branch.name,
            id: branch.id,
            status: branch.status,
            compute: branch.compute?.state
          })));
          
          // Use the first branch for further tests
          const branch = branches[0];
          console.log(`\n🌿 Using branch: ${branch.name} (${branch.id})`);
          
          // Test 5: Check storage
          console.log("\n📦 Test 5: Checking storage...");
          const { data: storage, error: storageError } = await neon.storage.get({
            projectId: project.id,
            branchId: branch.id
          });
          
          if (storageError) {
            console.log("ℹ️  Storage not available:", storageError.message);
          } else {
            console.log("✅ Storage status:", {
              enabled: storage.enabled,
              endpoint: storage.s3_endpoint_url,
              buckets: storage.buckets?.length || 0
            });
          }
          
          // Test 6: Check functions
          console.log("\n⚡ Test 6: Checking functions...");
          const { data: functions, error: functionsError } = await neon.functions.list({
            projectId: project.id,
            branchId: branch.id
          });
          
          if (functionsError) {
            console.log("ℹ️  Functions not available:", functionsError.message);
          } else {
            console.log("✅ Functions count:", functions.length);
            if (functions.length > 0) {
              console.log("  First function:", {
                name: functions[0].name,
                slug: functions[0].slug,
                status: functions[0].status
              });
            }
          }
        } else {
          console.log("ℹ️  No branches found in this project");
        }
      } else {
        console.log("ℹ️  No projects found in this organization");
      }
    } else {
      console.log("ℹ️  No organizations found");
    }
    
    console.log("\n🎉 All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during testing:", error.message);
    console.error("Stack:", error.stack);
  }
}

comprehensiveNeonTest();