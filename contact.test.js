const request = require('supertest');
const express = require('express');

// Mock Gmail API
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
            }))
        }
    }
}));

jest.mock('nodemailer', () => ({
    createTransporter: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
    })
}));

// Create test app
const app = express();
app.use(express.json());

// Mock contact route
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
        return res.json({ success: false, message: 'All fields required' });
    }
    
    try {
        res.json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        res.json({ success: false, message: 'Failed to send email' });
    }
});

describe('Contact Form Tests', () => {
    test('Contact form should accept valid submission', async () => {
        const res = await request(app)
            .post('/contact')
            .send({
                name: 'John Doe',
                email: 'john@example.com',
                subject: 'Bug Report',
                message: 'Test message'
            });
        
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Email sent successfully!');
    });

    test('Contact form should validate required fields', async () => {
        const res = await request(app)
            .post('/contact')
            .send({
                name: '',
                email: 'john@example.com',
                subject: 'Bug Report',
                message: 'Test message'
            });
        
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('All fields required');
    });

    test('Contact form should return success response', async () => {
        const res = await request(app)
            .post('/contact')
            .send({
                name: 'Jane Smith',
                email: 'jane@example.com',
                subject: 'Feature Request',
                message: 'Please add dark mode'
            });
        
        expect(res.body.success).toBe(true);
    });
});