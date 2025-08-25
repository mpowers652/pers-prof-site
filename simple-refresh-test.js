const request = require('supertest');
const app = require('./server');

// Simple test to check if the refresh endpoint exists
request(app)
    .post('/auth/refresh')
    .send({})
    .end((err, res) => {
        console.log('Status:', res.status);
        console.log('Body:', res.body);
        console.log('Text:', res.text);
        process.exit(0);
    });