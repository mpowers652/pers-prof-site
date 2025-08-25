const OpenAI = require('openai');
require('dotenv').config();

async function testOpenAIConnection() {
    try {
        const openai = new OpenAI({ 
            apiKey: process.env.OPENAI_MASTER_API_KEY,
            organization: process.env.OPENAI_ORG_ID 
        });
        
        console.log('Testing OpenAI connection...');
        console.log('API Key available:', !!process.env.OPENAI_MASTER_API_KEY);
        console.log('Org ID available:', !!process.env.OPENAI_ORG_ID);
        
        // Test API key creation
        const apiKey = await openai.apiKeys.create({
            name: `Test-${Date.now()}`
        });
        
        console.log('✓ OpenAI key created successfully:', apiKey.key.substring(0, 20) + '...');
        return true;
    } catch (error) {
        console.log('✗ OpenAI connection failed:', error.message);
        return false;
    }
}

testOpenAIConnection();