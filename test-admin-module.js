const request = require('supertest');

// Admin test functions that can be called from test files
async function performAdminLogin(app, username = 'admin', password = 'test123') {
    const loginResponse = await request(app)
        .post('/auth/login')
        .send({ username, password });
    return loginResponse.body.token;
}

async function testAdminEmailConfiguration(app, token) {
    const setEmailResponse = await request(app)
        .post('/admin/set-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newemail@example.com' });
    
    return setEmailResponse;
}

async function testPrivacyPolicyDetection(app, token) {
    const response = await request(app)
        .post('/privacy-policy/detect-changes')
        .set('Authorization', `Bearer ${token}`);
    
    return response;
}

module.exports = {
    performAdminLogin,
    testAdminEmailConfiguration,
    testPrivacyPolicyDetection
};