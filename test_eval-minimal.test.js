const mockEvaluate = jest.fn();
jest.mock('mathjs', () => ({ evaluate: mockEvaluate }));

describe('test_eval.js Minimal Coverage', () => {
    let evaluateExpression;

    beforeAll(() => {
        console.log = jest.fn();
        console.error = jest.fn();
        const module = require('./test_eval.js');
        evaluateExpression = module.evaluateExpression;
    });

    beforeEach(() => jest.clearAllMocks());

    test('symbol replacements', () => {
        mockEvaluate.mockReturnValue(6);
        evaluateExpression('2×3÷π^e');
        expect(mockEvaluate).toHaveBeenCalledWith('2*3/pi^e');
    });

    test('complex number cases', () => {
        // Pure imaginary i
        mockEvaluate.mockReturnValue({ re: 0, im: 1 });
        expect(evaluateExpression('i')).toBe('i');

        // Pure imaginary -i  
        mockEvaluate.mockReturnValue({ re: 0, im: -1 });
        expect(evaluateExpression('-i')).toBe('-i');

        // Complex with coefficient
        mockEvaluate.mockReturnValue({ re: 0, im: 3 });
        expect(evaluateExpression('3i')).toBe('3i');

        // Complex with real + imaginary = 1
        mockEvaluate.mockReturnValue({ re: 2, im: 1 });
        expect(evaluateExpression('2+i')).toBe('2 + i');

        // Complex with real + imaginary = -1
        mockEvaluate.mockReturnValue({ re: 2, im: -1 });
        expect(evaluateExpression('2-i')).toBe('2 - i');

        // Complex positive
        mockEvaluate.mockReturnValue({ re: 3, im: 4 });
        expect(evaluateExpression('3+4i')).toBe('3 + 4i');

        // Complex negative
        mockEvaluate.mockReturnValue({ re: 5, im: -2 });
        expect(evaluateExpression('5-2i')).toBe('5 - 2i');

        // Very small imaginary
        mockEvaluate.mockReturnValue({ re: 7, im: 1e-15 });
        expect(evaluateExpression('7')).toBe(7);

        // Very small real
        mockEvaluate.mockReturnValue({ re: 1e-15, im: 2 });
        expect(evaluateExpression('2i')).toBe('2i');

        // Real only
        mockEvaluate.mockReturnValue({ re: 8, im: 0 });
        expect(evaluateExpression('8')).toBe(8);
    });

    test('number handling', () => {
        // Close to integer
        mockEvaluate.mockReturnValue(7.999999999999999);
        expect(evaluateExpression('8')).toBe(8);

        // Precision rounding
        mockEvaluate.mockReturnValue(3.141592653589793238);
        const result = evaluateExpression('pi');
        expect(typeof result).toBe('number');

        // Infinite
        mockEvaluate.mockReturnValue(Infinity);
        expect(evaluateExpression('1/0')).toBe(Infinity);

        // NaN
        mockEvaluate.mockReturnValue(NaN);
        expect(evaluateExpression('0/0')).toBe(NaN);

        // Non-number result
        mockEvaluate.mockReturnValue('string');
        expect(evaluateExpression('func()')).toBe('string');
    });

    test('error handling', () => {
        mockEvaluate.mockImplementation(() => { throw new Error('test'); });
        expect(evaluateExpression('invalid')).toBe('invalid');
        expect(console.error).toHaveBeenCalled();
    });
});