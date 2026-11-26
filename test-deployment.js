// Test script for the deployed version
console.log('Testing deployment-specific functionality...');

// Simulate the deployed environment
const originalHostname = global.window?.location?.hostname;
global.window = { location: { hostname: 'slash-as.github.io' } };

// Import the client after setting up the environment
import('./src/api/client.js').then(({ apiClient }) => {
  console.log('✅ Client imported successfully');
  
  // Test mock authentication
  apiClient.signIn('test@example.com', 'password').then(result => {
    console.log('✅ Mock authentication works:', result);
    
    // Test loading snapshot
    return apiClient.loadSnapshot();
  }).then(snapshot => {
    console.log('✅ Mock snapshot loading works:', snapshot);
    
    // Test creating a post
    return apiClient.createPost('Test post from deployment');
  }).then(post => {
    console.log('✅ Mock post creation works:', post);
    
    // Test toggling like
    return apiClient.toggleLike(post.id);
  }).then(updatedPost => {
    console.log('✅ Mock like toggle works:', updatedPost);
    
    console.log('\n🎉 All deployment tests passed!');
    console.log('The deployed version should now work with mock data.');
  }).catch(error => {
    console.error('❌ Test failed:', error);
  });
}).catch(error => {
  console.error('❌ Failed to import client:', error);
});

// Restore original hostname if it existed
if (originalHostname) {
  global.window.location.hostname = originalHostname;
}