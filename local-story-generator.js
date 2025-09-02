class LocalStoryGenerator {
    constructor() {
        this.generator = null;
        this.isLoading = false;
    }

    async initialize() {
        if (this.generator || this.isLoading) return;
        
        this.isLoading = true;
        try {
            const { pipeline } = require('@xenova/transformers');
            this.generator = await pipeline('text-generation', 'distilgpt2');
            console.log('Local story generator initialized');
        } catch (error) {
            console.error('Failed to initialize local generator:', error.message);
        } finally {
            this.isLoading = false;
        }
    }

    async generateStory(adjective, wordCount, subject) {
        if (!this.generator) {
            await this.initialize();
        }

        if (!this.generator) {
            throw new Error('Local generator not available');
        }

        const prompt = `Write a ${adjective} story about ${subject}.`;
        
        const result = await this.generator(prompt, {
            max_length: Math.min(parseInt(wordCount) + 50, 512),
            temperature: 0.7,
            do_sample: true,
            pad_token_id: 50256
        });

        return result[0].generated_text;
    }
}

module.exports = new LocalStoryGenerator();