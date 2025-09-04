// Mock supertest and server
const mockRequest = {
    post: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn()
};

const mockApp = {};

jest.mock('supertest', () => jest.fn(() => mockRequest));
jest.mock('./server', () => mockApp);

describe('Simple Refresh Test', () => {
    let originalExit;

    beforeEach(() => {
        jest.clearAllMocks();
        originalExit = process.exit;
        process.exit = jest.fn();
        console.log = jest.fn();
        
        // Reset module
        jest.resetModules();
    });

    afterEach(() => {
        process.exit = originalExit;
    });

    test('makes refresh request and exits', () => {
        // Mock the response
        const mockResponse = {
            status: 200,
            body: { success: true },
            text: 'OK'
        };

        mockRequest.end.mockImplementation((callback) => {
            callback(null, mockResponse);
        });

        require('./simple-refresh-test.js');

        expect(mockRequest.post).toHaveBeenCalledWith('/auth/refresh');
        expect(mockRequest.send).toHaveBeenCalledWith({});
        expect(mockRequest.end).toHaveBeenCalledWith(expect.any(Function));
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('handles request with error', () => {
        const mockError = new Error('Request failed');
        const mockResponse = {
            status: 500,
            body: { error: 'Server error' },
            text: 'Internal Server Error'
        };

        mockRequest.end.mockImplementation((callback) => {
            callback(mockError, mockResponse);
        });

        require('./simple-refresh-test.js');

        expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('logs response details', () => {
        const mockResponse = {
            status: 401,
            body: { message: 'Unauthorized' },
            text: 'Unauthorized'
        };

        mockRequest.end.mockImplementation((callback) => {
            callback(null, mockResponse);
        });

        require('./simple-refresh-test.js');

        expect(console.log).toHaveBeenCalledWith('Status:', 401);
        expect(console.log).toHaveBeenCalledWith('Body:', { message: 'Unauthorized' });
        expect(console.log).toHaveBeenCalledWith('Text:', 'Unauthorized');
    });
});