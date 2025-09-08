// Mock mathjs
const mockEvaluate = jest.fn();
jest.mock('mathjs', () => ({
    evaluate: mockEvaluate
}));

describe('Test Eval Simple', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        console.error = jest.fn();
        console.log = jest.fn();
    });

    test('loads test_eval module', () => {
        mockEvaluate.mockReturnValue(8);
        expect(() => require('./test_eval.js')).not.toThrow();
    });

    test('mathjs evaluate is called', () => {
        mockEvaluate.mockReturnValue(42);
        require('./test_eval.js');
        expect(mockEvaluate).toHaveBeenCalled();
    });
});