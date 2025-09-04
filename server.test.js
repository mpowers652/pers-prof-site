const request = require('supertest');
const { evaluateExpression } = require('./server');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_USER = 'test@gmail.com';

// Mock Gmail API
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
            }))
        },
        gmail: jest.fn().mockReturnValue({
            users: {
                messages: {
                    send: jest.fn().mockResolvedValue({ data: { id: 'mock-message-id' } })
                }
            }
        })
    }
}));

jest.mock('nodemailer', () => ({
    createTransporter: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
    })
}));

// Mock EJS rendering
jest.mock('ejs', () => ({
    renderFile: jest.fn((file, data, callback) => {
        callback(null, `<html><body>Mock ${file}</body></html>`);
    })
}));

// Import actual server after mocking
const app = require('./server');

function simplifySymbolic(expr) {
    // Split by + and - while keeping operators
    const terms = expr.split(/([+-])/).filter(t => t.trim());
    let numericSum = 0;
    const variables = {};
    
    let currentSign = 1;
    
    for (let i = 0; i < terms.length; i++) {
        const term = terms[i].trim();
        
        if (term === '+') {
            currentSign = 1;
        } else if (term === '-') {
            currentSign = -1;
        } else {
            // Parse term for coefficient and variable
            const match = term.match(/^(\d*)\*?([a-zA-Z]+)$|^(\d+)$/);
            
            if (match && match[3]) {
                // Pure number
                numericSum += currentSign * parseInt(match[3]);
            } else if (match && match[2]) {
                // Variable term
                const coeff = match[1] === '' ? 1 : parseInt(match[1]);
                const variable = match[2];
                variables[variable] = (variables[variable] || 0) + currentSign * coeff;
            } else {
                // Try to evaluate numeric parts
                const numMatch = term.match(/^(\d+(?:[+\-*/]\d+)*)\*?([a-zA-Z]+)$/);
                if (numMatch) {
                    const numPart = Function('"use strict"; return (' + numMatch[1] + ')')();
                    const variable = numMatch[2];
                    variables[variable] = (variables[variable] || 0) + currentSign * numPart;
                }
            }
        }
    }
    
    // Build result
    const parts = [];
    
    if (numericSum !== 0) {
        parts.push(numericSum.toString());
    }
    
    for (const [variable, coeff] of Object.entries(variables)) {
        if (coeff !== 0) {
            if (coeff === 1) {
                parts.push(parts.length > 0 ? `+ ${variable}` : variable);
            } else if (coeff === -1) {
                parts.push(`- ${variable}`);
            } else if (coeff > 0) {
                parts.push(parts.length > 0 ? `+ ${coeff}${variable}` : `${coeff}${variable}`);
            } else {
                parts.push(`- ${Math.abs(coeff)}${variable}`);
            }
        }
    }
    
    return parts.length > 0 ? parts.join(' ') : '0';
}

function combineSymbolic(a, b, op) {
    if (a === b) {
        if (op === '+') return `2${a}`;
        if (op === '-') return '0';
        if (op === '*') return `${a}^2`;
        if (op === '/') return '1';
    }
    
    const parseCoeff = (term) => {
        const match = term.match(/^(\d*)([a-zA-Z]+)$/);
        if (match) {
            const coeff = match[1] === '' ? 1 : parseInt(match[1]);
            const variable = match[2];
            return { coeff, variable };
        }
        return null;
    };
    
    const termA = parseCoeff(a);
    const termB = parseCoeff(b);
    
    if (termA && termB && termA.variable === termB.variable) {
        if (op === '+' || op === '-') {
            const newCoeff = op === '+' ? termA.coeff + termB.coeff : termA.coeff - termB.coeff;
            if (newCoeff === 0) return '0';
            if (newCoeff === 1) return termA.variable;
            return `${newCoeff}${termA.variable}`;
        }
        if (op === '*') {
            const newCoeff = termA.coeff * termB.coeff;
            return `${newCoeff}${termA.variable}^2`;
        }
        if (op === '/') {
            if (termB.coeff === 0) return 'Division by zero';
            const newCoeff = termA.coeff / termB.coeff;
            return newCoeff === 1 ? '1' : `${newCoeff}`;
        }
    }
    
    const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op;
    return `${a} ${opSymbol} ${b}`;
}

describe('Server Tests', () => {
    test('GET /math should return math page', async () => {
        const res = await request(app).get('/math');
        expect(res.status).toBe(200);
    });

    test('GET /fft-visualizer should return fft page', async () => {
        const res = await request(app).get('/fft-visualizer');
        expect(res.status).toBe(200);
    });

    test('GET /contact should return contact page', async () => {
        const res = await request(app).get('/contact');
        expect(res.status).toBe(200);
    });

    test('POST /contact should handle valid submission', async () => {
        const res = await request(app)
            .post('/contact')
            .send({
                name: 'John Doe',
                email: 'john@example.com',
                subject: 'Bug Report',
                message: 'Test message'
            });
        expect(res.body.success).toBe(true);
    });

    test('POST /contact should validate required fields', async () => {
        const res = await request(app)
            .post('/contact')
            .send({ name: '', email: 'test@test.com', subject: 'Test', message: 'Test' });
        expect(res.body.success).toBe(false);
    });

    test('GET / should redirect to login when unauthenticated', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    test('GET / should return home page for authenticated users', async () => {
        // Wait for admin user creation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '1h' });
        const res = await request(app)
            .get('/')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain('html');
    });

    test('POST /math/calculate should handle calculations', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '2 + 2' });
        expect(res.body.result).toBe(4);
    });
});

describe('EvaluateExpression Function Tests', () => {
    test('Should handle basic arithmetic', () => {
        expect(evaluateExpression('2 + 3')).toBe(5);
        expect(evaluateExpression('10 - 4')).toBe(6);
        expect(evaluateExpression('3 * 4')).toBe(12);
        expect(evaluateExpression('15 / 3')).toBe(5);
    });

    test('Should handle exponentiation', () => {
        expect(evaluateExpression('2^3')).toBe(8);
        expect(evaluateExpression('5^2')).toBe(25);
    });

    test('Should handle pi constant', () => {
        const result = evaluateExpression('π');
        expect(Math.abs(result - Math.PI)).toBeLessThan(0.001);
    });

    test('Should handle complex numbers', () => {
        expect(evaluateExpression('i^2')).toBe(-1);
        expect(evaluateExpression('i')).toBe('i');
    });

    test('Should handle trigonometric functions', () => {
        expect(evaluateExpression('sin(0)')).toBe(0);
        expect(evaluateExpression('cos(0)')).toBe(1);
    });

    test('Should handle logarithms', () => {
        expect(evaluateExpression('ln(e)')).toBe(1);
    });

    test('Should handle square root', () => {
        expect(evaluateExpression('sqrt(16)')).toBe(4);
    });

    test('Should handle error cases', () => {
        const result = evaluateExpression('invalid_expression');
        expect(typeof result).toBe('string');
    });
});

describe('Math Calculator Tests', () => {
    test('Simple addition', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '5 + 3' });
        expect(res.body.result).toBe(8);
    });

    test('Order of operations - multiplication first', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '2 + 3 * 4' });
        expect(res.body.result).toBe(14);
    });

    test('Order of operations with parentheses', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '(2 + 3) * 4' });
        expect(res.body.result).toBe(20);
    });

    test('Complex expression', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '10 / 2 + 3 * 4 - 1' });
        expect(res.body.result).toBe(16);
    });

    test('Symbolic expression', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '4+4+4+4*a' });
        expect(res.body.result).toBe('4 * a + 12');
    });

    test('Mixed symbolic expression', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '2*x + 3 + x' });
        expect(res.body.result).toBe('3 * (x + 1)');
    });

    test('Exponentiation', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '2^3' });
        expect(res.body.result).toBe(8);
    });

    test('Square root', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sqrt(16)' });
        expect(res.body.result).toBe(4);
    });

    test('Factorial', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '5!' });
        expect(res.body.result).toBe(120);
    });

    test('Fractional exponentiation', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '16^0.5' });
        expect(res.body.result).toBe(4);
    });

    test('Cube root via fractional power', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '8^(1/3)' });
        expect(res.body.result).toBe(2);
    });

    test('Sine function - radians', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sin(0)' });
        expect(res.body.result).toBe(0);
    });

    test('Cosine function - radians', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'cos(0)' });
        expect(res.body.result).toBe(1);
    });

    test('Sine of π/2 radians', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sin(π/2)' });
        expect(Math.abs(res.body.result - 1)).toBeLessThan(0.001);
    });

    test('Pi constant', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'π' });
        expect(Math.abs(res.body.result - Math.PI)).toBeLessThan(0.001);
    });

    test('sin(π) + cos(π)', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sin(π)+cos(π)' });
        expect(Math.abs(res.body.result - (-1))).toBeLessThan(0.001);
    });

    test('Symbolic trigonometry', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sin(x) + cos(y)' });
        expect(res.body.result).toBe('sin(x) + cos(y)');
    });

    test('Individual letter variables - s', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 's + 5' });
        expect(res.body.result).toBe('s + 5');
    });

    test('Individual letter variables - i', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '2*i + 3' });
        expect(res.body.result).toBe('3 + 2i');
    });

    test('Individual letter variables - n', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'n^2' });
        expect(res.body.result).toBe('n ^ 2');
    });

    test('Function vs variable distinction', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 's + sin(0)' });
        expect(res.body.result).toBe('s');
    });

    test('Floating point precision - exact 1', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '1.0' });
        expect(res.body.result).toBe(1);
    });

    test('Floating point precision - 0.999999999999999', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '0.999999999999999' });
        console.log('0.999999999999999 =', res.body.result);
        expect(typeof res.body.result).toBe('number');
    });

    test('Floating point precision - 0.9999999999999999', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '0.9999999999999999' });
        console.log('0.9999999999999999 =', res.body.result);
        expect(typeof res.body.result).toBe('number');
    });

    test('Floating point precision - sin(π)', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'sin(π)' });
        console.log('sin(π) =', res.body.result);
        expect(Math.abs(res.body.result)).toBeLessThan(1e-15);
    });

    test('Arc sine function', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'asin(1)' });
        expect(res.body.result).toBe('π/2');
    });

    test('Arc cosine function', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'acos(0)' });
        expect(res.body.result).toBe('π/2');
    });

    test('Arc tangent function', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'atan(1)' });
        expect(res.body.result).toBe('π/4');
    });

    test('Natural logarithm function', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'ln(e)' });
        expect(res.body.result).toBe(1);
    });

    test('Euler constant', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'e' });
        expect(Math.abs(res.body.result - Math.E)).toBeLessThan(0.001);
    });

    test('Base 10 logarithm function', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'log(100)' });
        expect(res.body.result).toBe(2);
    });

    test('Imaginary unit', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'i' });
        expect(res.body.result).toBe('i');
    });

    test('Complex arithmetic', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'i^2' });
        expect(res.body.result).toBe(-1);
    });

    test('Euler formula', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: 'exp(i * pi)' });
        expect(res.body.result).toBe(-1);
    });

    test('Powers of i', async () => {
        const res1 = await request(app)
            .post('/math/calculate')
            .send({ expression: 'i^2' });
        expect(res1.body.result).toBe(-1);
        
        const res2 = await request(app)
            .post('/math/calculate')
            .send({ expression: 'i^3' });
        expect(res2.body.result).toBe('-i');
        
        const res3 = await request(app)
            .post('/math/calculate')
            .send({ expression: 'i^4' });
        expect(res3.body.result).toBe(1);
    });

    test('Empty input validation', async () => {
        const res = await request(app)
            .post('/math/calculate')
            .send({ expression: '' });
        expect(res.body.result).toBe('Please enter an expression');
    });
});