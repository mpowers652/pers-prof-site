// Mock mathjs
const mockEvaluate = jest.fn();
jest.mock('mathjs', () => ({
    evaluate: mockEvaluate
}));

// Import the actual evaluateExpression function
const { evaluateExpression } = require('./test_eval.js');

describe('Test Eval Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
        console.log = jest.fn();
        
        // Clear mocks but don't mock evaluateExpression itself
    });

    test('evaluates simple arithmetic', () => {
        mockEvaluate.mockReturnValue(8);
        const result = evaluateExpression('2^3');
        expect(result).toBe(8);
    });

    test('handles complex numbers with real and imaginary parts', () => {
        mockEvaluate.mockReturnValue({ re: 3, im: 2 });
        const result = evaluateExpression('3 + 2*i');
        expect(result).toBe('3 + 2i');
    });

    test('handles pure imaginary numbers', () => {
        mockEvaluate.mockReturnValue({ re: 0, im: 1 });
        const result = evaluateExpression('i');
        expect(result).toBe('i');
    });

    test('handles negative imaginary numbers', () => {
        mockEvaluate.mockReturnValue({ re: 0, im: -1 });
        const result = evaluateExpression('-i');
        expect(result).toBe('-i');
    });

    test('handles complex with negative imaginary', () => {
        mockEvaluate.mockReturnValue({ re: 5, im: -3 });
        const result = evaluateExpression('5 - 3*i');
        expect(result).toBe('5 - 3i');
    });

    test('handles real numbers from complex', () => {
        mockEvaluate.mockReturnValue({ re: 7, im: 0 });
        const result = evaluateExpression('7 + 0*i');
        expect(result).toBe(7);
    });

    test('handles very small imaginary parts', () => {
        mockEvaluate.mockReturnValue({ re: 5, im: 1e-15 });
        const result = evaluateExpression('5');
        expect(result).toBe(5);
    });

    test('rounds very close integers', () => {
        mockEvaluate.mockReturnValue(7.999999999999999);
        const result = evaluateExpression('8 - 1e-15');
        expect(result).toBe(8);
    });

    test('handles precision for non-integers', () => {
        mockEvaluate.mockReturnValue(3.141592653589793);
        const result = evaluateExpression('pi');
        expect(typeof result).toBe('number');
    });

    test('replaces mathematical symbols', () => {
        mockEvaluate.mockReturnValue(6);
        evaluateExpression('2×3');
        expect(mockEvaluate).toHaveBeenCalledWith('2*3');
    });

    test('replaces division symbol', () => {
        mockEvaluate.mockReturnValue(2);
        evaluateExpression('6÷3');
        expect(mockEvaluate).toHaveBeenCalledWith('6/3');
    });

    test('replaces pi symbol', () => {
        mockEvaluate.mockReturnValue(3.14159);
        evaluateExpression('π');
        expect(mockEvaluate).toHaveBeenCalledWith('pi');
    });

    test('handles evaluation errors', () => {
        mockEvaluate.mockImplementation(() => {
            throw new Error('Invalid expression');
        });
        
        const result = evaluateExpression('invalid');
        expect(result).toBe('invalid');
        expect(console.error).toHaveBeenCalledWith('Error evaluating expression:', expect.any(Error));
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
});