// Mock mathjs
const mockEvaluate = jest.fn();
jest.mock('mathjs', () => ({
    evaluate: mockEvaluate
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('test_eval.js Coverage Tests', () => {
    let evaluateExpression;

    beforeAll(() => {
        console.log = jest.fn();
        console.error = jest.fn();
        
        // Load the module after mocking
        delete require.cache[require.resolve('./test_eval.js')];
        require('./test_eval.js');
        
        // Extract the function from the module's execution context
        evaluateExpression = global.evaluateExpression;
    });

    afterAll(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test symbol replacements
    test('replaces × with *', () => {
        mockEvaluate.mockReturnValue(6);
        const expr = '2×3';
        evaluateExpression(expr);
        expect(mockEvaluate).toHaveBeenCalledWith('2*3');
    });

    test('replaces ÷ with /', () => {
        mockEvaluate.mockReturnValue(2);
        const expr = '6÷3';
        evaluateExpression(expr);
        expect(mockEvaluate).toHaveBeenCalledWith('6/3');
    });

    test('replaces π with pi', () => {
        mockEvaluate.mockReturnValue(3.14159);
        const expr = 'π';
        evaluateExpression(expr);
        expect(mockEvaluate).toHaveBeenCalledWith('pi');
    });

    test('replaces e with e', () => {
        mockEvaluate.mockReturnValue(2.718);
        const expr = 'e';
        evaluateExpression(expr);
        expect(mockEvaluate).toHaveBeenCalledWith('e');
    });

    test('replaces ^ with ^', () => {
        mockEvaluate.mockReturnValue(8);
        const expr = '2^3';
        evaluateExpression(expr);
        expect(mockEvaluate).toHaveBeenCalledWith('2^3');
    });

    // Test complex number handling
    test('handles complex with very small imaginary part', () => {
        mockEvaluate.mockReturnValue({ re: 5, im: 1e-15 });
        const result = evaluateExpression('5');
        expect(result).toBe(5);
    });

    test('handles pure imaginary i', () => {
        mockEvaluate.mockReturnValue({ re: 0, im: 1 });
        const result = evaluateExpression('i');
        expect(result).toBe('i');
    });

    test('handles pure imaginary -i', () => {
        mockEvaluate.mockReturnValue({ re: 0, im: -1 });
        const result = evaluateExpression('-i');
        expect(result).toBe('-i');
    });

    test('handles pure imaginary with coefficient', () => {
        mockEvaluate.mockReturnValue({ re: 0, im: 3 });
        const result = evaluateExpression('3i');
        expect(result).toBe('3i');
    });

    test('handles real part only from complex', () => {
        mockEvaluate.mockReturnValue({ re: 7, im: 0 });
        const result = evaluateExpression('7');
        expect(result).toBe(7);
    });

    test('handles complex with imaginary = 1', () => {
        mockEvaluate.mockReturnValue({ re: 3, im: 1 });
        const result = evaluateExpression('3+i');
        expect(result).toBe('3 + i');
    });

    test('handles complex with imaginary = -1', () => {
        mockEvaluate.mockReturnValue({ re: 3, im: -1 });
        const result = evaluateExpression('3-i');
        expect(result).toBe('3 - i');
    });

    test('handles complex with positive imaginary', () => {
        mockEvaluate.mockReturnValue({ re: 2, im: 3 });
        const result = evaluateExpression('2+3i');
        expect(result).toBe('2 + 3i');
    });

    test('handles complex with negative imaginary', () => {
        mockEvaluate.mockReturnValue({ re: 5, im: -2 });
        const result = evaluateExpression('5-2i');
        expect(result).toBe('5 - 2i');
    });

    test('handles very small real part', () => {
        mockEvaluate.mockReturnValue({ re: 1e-15, im: 2 });
        const result = evaluateExpression('2i');
        expect(result).toBe('2i');
    });

    // Test number rounding
    test('rounds very close integers', () => {
        mockEvaluate.mockReturnValue(7.999999999999999);
        const result = evaluateExpression('8-1e-15');
        expect(result).toBe(8);
    });

    test('handles precision for non-integers', () => {
        mockEvaluate.mockReturnValue(3.141592653589793238);
        const result = evaluateExpression('pi');
        expect(typeof result).toBe('number');
        expect(result).toBe(Math.round(3.141592653589793238 * 1e15) / 1e15);
    });

    test('handles infinite results', () => {
        mockEvaluate.mockReturnValue(Infinity);
        const result = evaluateExpression('1/0');
        expect(result).toBe(Infinity);
    });

    test('handles NaN results', () => {
        mockEvaluate.mockReturnValue(NaN);
        const result = evaluateExpression('0/0');
        expect(result).toBe(NaN);
    });

    test('handles non-number, non-complex results', () => {
        mockEvaluate.mockReturnValue('some string');
        const result = evaluateExpression('someFunction()');
        expect(result).toBe('some string');
    });

    // Test error handling
    test('handles evaluation errors', () => {
        mockEvaluate.mockImplementation(() => {
            throw new Error('Invalid expression');
        });
        
        const result = evaluateExpression('invalid');
        expect(result).toBe('invalid');
        expect(console.error).toHaveBeenCalledWith('Error evaluating expression:', expect.any(Error));
    });

    // Test module loads without errors
    test('module loads and executes', () => {
        expect(evaluateExpression).toBeDefined();
        expect(typeof evaluateExpression).toBe('function');
    });
});