// Mock @xenova/transformers
const mockPipeline = jest.fn();
const mockGenerator = jest.fn();

jest.mock('@xenova/transformers', () => ({
    pipeline: mockPipeline
}));

describe('LocalStoryGenerator', () => {
    let generator;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        mockGenerator.mockResolvedValue([{
            generated_text: 'Generated story content'
        }]);
        
        mockPipeline.mockResolvedValue(mockGenerator);
        
        generator = require('./local-story-generator.js');
        
        // Reset instance state
        generator.generator = null;
        generator.isLoading = false;
    });

    describe('initialize', () => {
        test('initializes generator successfully', async () => {
            await generator.initialize();
            
            expect(mockPipeline).toHaveBeenCalledWith('text-generation', 'distilgpt2');
            expect(generator.generator).toBe(mockGenerator);
            expect(generator.isLoading).toBe(false);
        });

        test('does not initialize if already loading', async () => {
            generator.isLoading = true;
            
            await generator.initialize();
            
            expect(mockPipeline).not.toHaveBeenCalled();
        });

        test('does not initialize if generator already exists', async () => {
            generator.generator = mockGenerator;
            
            await generator.initialize();
            
            expect(mockPipeline).not.toHaveBeenCalled();
        });

        test('handles initialization error', async () => {
            const error = new Error('Initialization failed');
            mockPipeline.mockRejectedValue(error);
            console.error = jest.fn();
            
            await generator.initialize();
            
            expect(console.error).toHaveBeenCalledWith('Failed to initialize local generator:', error.message);
            expect(generator.generator).toBe(null);
            expect(generator.isLoading).toBe(false);
        });
    });

    describe('generateStory', () => {
        test('generates story with existing generator', async () => {
            generator.generator = mockGenerator;
            
            const result = await generator.generateStory('exciting', '100', 'dragons');
            
            expect(mockGenerator).toHaveBeenCalledWith(
                'Write a exciting story about dragons.',
                {
                    max_length: 150,
                    temperature: 0.7,
                    do_sample: true,
                    pad_token_id: 50256
                }
            );
            expect(result).toBe('Generated story content');
        });

        test('initializes generator if not available', async () => {
            const result = await generator.generateStory('funny', '50', 'cats');
            
            expect(mockPipeline).toHaveBeenCalledWith('text-generation', 'distilgpt2');
            expect(result).toBe('Generated story content');
        });

        test('throws error if generator fails to initialize', async () => {
            mockPipeline.mockRejectedValue(new Error('Init failed'));
            console.error = jest.fn();
            
            await expect(generator.generateStory('sad', '200', 'robots'))
                .rejects.toThrow('Local generator not available');
        });

        test('limits max_length to 512', async () => {
            generator.generator = mockGenerator;
            
            await generator.generateStory('long', '1000', 'epic tale');
            
            expect(mockGenerator).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    max_length: 512
                })
            );
        });

        test('handles string word count', async () => {
            generator.generator = mockGenerator;
            
            await generator.generateStory('short', '25', 'mice');
            
            expect(mockGenerator).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    max_length: 75
                })
            );
        });
    });

    describe('constructor', () => {
        test('initializes with null generator and not loading', () => {
            const newGenerator = require('./local-story-generator.js');
            expect(newGenerator.generator).toBe(null);
            expect(newGenerator.isLoading).toBe(false);
        });
    });
});