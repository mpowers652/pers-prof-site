// Mock mathjs
jest.mock('mathjs', () => ({
    evaluate: jest.fn()
}));

const { evaluate } = require('mathjs');

describe('Test Eval Simple', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();
        console.log = jest.fn();
    });

    test('loads test_eval module', () => {
        evaluate.mockReturnValue(8);
        expect(() => require('./test_eval.js')).not.toThrow();
    });

    test('mathjs evaluate is called', () => {
        evaluate.mockReturnValue(42);
        require('./test_eval.js');
        expect(evaluate).toHaveBeenCalled();
    });
});