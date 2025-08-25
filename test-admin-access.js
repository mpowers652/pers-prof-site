const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

// Test admin access with the configured admin email
async function testAdminAccess() {
    const adminEmail = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';
    
    // Login as the admin user (created at startup)
    const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'test' }); // This will fail but shows the flow
    
    console.log('Admin email configured as:', adminEmail);
    console.log('Login attempt result:', loginResponse.body);
    
    // Create a token for a user with admin email
    const adminUser = {
        id: 999,
        email: adminEmail,
        role: 'admin',
        subscription: 'full'
    };
    
    const token = jwt.sign({ id: adminUser.id }, 'secret', { expiresIn: '10m' });
    
    // Mock the user lookup by adding to users array
    const server = require('./server');
    const users = [];
    users.push(adminUser);
    
    console.log('Testing story generator access with admin token...');
    
    // Test story generator access
    const storyResponse = await request(app)
        .get('/story-generator')
        .set('Authorization', `Bearer ${token}`);
    
    console.log('Story generator response status:', storyResponse.status);
    console.log('Story generator response:', storyResponse.text.substring(0, 100));
}

testAdminAccess().catch(console.error);