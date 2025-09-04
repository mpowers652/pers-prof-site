const request = require('supertest');
const jwt = require('jsonwebtoken');

// Test admin access functions that can be called from test files
async function testAdminAccess(app) {
    const adminEmail = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';
    
    console.log('Admin email configured as:', adminEmail);
    
    // Login as the admin user (created at startup)
    const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: 'test' });
    
    console.log('Login attempt result:', loginResponse.body);
    
    // Create a token for a user with admin email
    const adminUser = {
        id: 999,
        email: adminEmail,
        role: 'admin',
        subscription: 'full'
    };
    
    const token = jwt.sign({ id: adminUser.id }, 'secret', { expiresIn: '10m' });
    
    console.log('Testing story generator access with admin token...');
    
    // Test story generator access
    const storyResponse = await request(app)
        .get('/story-generator')
        .set('Authorization', `Bearer ${token}`);
    
    console.log('Story generator response status:', storyResponse.status);
    
    return { loginResponse, storyResponse, token };
}

module.exports = {
    testAdminAccess
};