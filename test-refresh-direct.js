const jwt = require('jsonwebtoken');

// Test the refresh endpoint directly
const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
console.log('Generated token:', token);

// Test token parsing
try {
    const decoded = jwt.verify(token, 'secret', { ignoreExpiration: true });
    console.log('Decoded token:', decoded);
} catch (error) {
    console.error('Token decode error:', error.message);
}