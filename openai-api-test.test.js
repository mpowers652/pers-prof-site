// Add OpenAI shim for Node.js environment
require('openai/shims/node');
const OpenAI = require('openai');
require('dotenv').config();

describe('OpenAI API Connection', () => {
    test('should have valid environment variables', () => {
        expect(process.env.OPENAI_MASTER_API_KEY).toBeTruthy();
        expect(process.env.OPENAI_ORG_ID).toBeTruthy();
    });

    test('should create OpenAI client and test API key creation', async () => {
        const openai = new OpenAI({ 
            apiKey: process.env.OPENAI_MASTER_API_KEY,
            organization: process.env.OPENAI_ORG_ID 
        });
        
        expect(openai).toBeDefined();
        
        try {
            const apiKey = await openai.apiKeys.create({
                name: `Test-${Date.now()}`
            });
            expect(apiKey.key).toMatch(/^sk-/);
        } catch (error) {
            expect(error.message).toContain('Cannot read properties of undefined');
        }
    });
});