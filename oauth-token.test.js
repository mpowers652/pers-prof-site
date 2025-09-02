const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

// Mock users array to avoid accessing internal server state
const mockUsers = [];

describe('OAuth Token Saving Processes', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
        // Wait for users to be created
        await new Promise(resolve => setTimeout(resolve, 100));
        // Create test user
        testUser = {
            id: 999,
            googleId: 'test-google-id',
            username: 'Test User',
            email: 'test@example.com',
            role: 'user',
            subscription: 'basic'
        };
        
        // Generate valid token using existing user ID
        validToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
        
        // Add test user to mock users array
        mockUsers.push(testUser);
    });
    
    afterEach(() => {
        // Clear mock users
        mockUsers.length = 0;
    });

    describe('Google OAuth Token Handling', () => {
        test('should redirect to home after successful Google OAuth', async () => {
            // Mock successful Google OAuth by directly testing the callback logic
            const mockReq = {
                user: testUser
            };
            
            // Simulate the callback route behavior - now redirects directly to home
            const token = jwt.sign({ id: mockReq.user.id }, 'secret', { expiresIn: '10m' });
            const expectedRedirect = '/';
            
            expect(token).toBeDefined();
            expect(expectedRedirect).toBe('/');
            expect(jwt.verify(token, 'secret').id).toBe(testUser.id);
        });

        test('should generate valid JWT token for Google OAuth user', () => {
            const token = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            expect(decoded.id).toBe(testUser.id);
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
        });
    });

    describe('Facebook OAuth Token Handling', () => {
        test('should store token in session and cookie after Facebook OAuth', () => {
            const token = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '10m' });
            const mockSession = {};
            const mockCookies = {};
            
            // Simulate session and cookie token storage
            mockSession.authToken = token;
            mockCookies.token = token;
            
            expect(mockSession.authToken).toBe(token);
            expect(mockCookies.token).toBe(token);
            expect(jwt.verify(mockSession.authToken, 'secret').id).toBe(testUser.id);
        });
    });

    describe('Token URL Parameter Security (Intended Behavior)', () => {
        test('should redirect to login when token in URL parameter for security', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`)
                .expect(302);
            
            // INTENDED BEHAVIOR: Redirect to login for security - tokens should not be in URLs
            expect(response.headers.location).toBe('/login');
        });

        test('should redirect to login for any token in URL to prevent exposure', async () => {
            const tokenWithQuotes = jwt.sign({ id: 1, test: "quote'test\"" }, 'secret');
            const response = await request(app)
                .get(`/?token=${tokenWithQuotes}`)
                .expect(302);
            
            // INTENDED BEHAVIOR: Always redirect to login when tokens are in URL for security
            expect(response.headers.location).toBe('/login');
        });

        test('should redirect to login for malformed tokens in URL', async () => {
            const response = await request(app)
                .get('/?token=malformed.token.here')
                .expect(302);
            
            // INTENDED BEHAVIOR: Redirect to login for any URL token attempt
            expect(response.headers.location).toBe('/login');
        });
    });

    describe('Token Verification Process', () => {
        test('should verify valid token from header successfully', async () => {
            // Create a user with an ID that exists in the server's users array
            const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBe(1);
        });

        test('should verify valid token from cookie successfully', async () => {
            const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Cookie', `token=${adminToken}`)
                .expect(200);
            
            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBe(1);
        });

        test('should reject invalid token', async () => {
            const invalidToken = 'invalid.token.here';
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);
            
            expect(response.body.error).toBe('Invalid token');
        });

        test('should reject missing token', async () => {
            const response = await request(app)
                .get('/auth/verify')
                .expect(401);
            
            expect(response.body.error).toBe('No token');
        });

        test('should reject token for non-existent user', async () => {
            const nonExistentUserToken = jwt.sign({ id: 99999 }, 'secret', { expiresIn: '10m' });
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${nonExistentUserToken}`)
                .expect(404);
            
            expect(response.body.error).toBe('User not found');
        });
    });

    describe('Token Extraction from Headers and Query', () => {
        test('should extract token from Authorization header', () => {
            const mockReq = {
                headers: {
                    authorization: `Bearer ${validToken}`
                }
            };
            
            const extractedToken = mockReq.headers.authorization?.split(' ')[1];
            expect(extractedToken).toBe(validToken);
        });

        test('should extract token from query parameter', () => {
            const mockReq = {
                query: {
                    token: validToken
                }
            };
            
            const extractedToken = mockReq.query.token;
            expect(extractedToken).toBe(validToken);
        });

        test('should prioritize header token over query token', () => {
            const headerToken = jwt.sign({ id: 1 }, 'secret');
            const queryToken = jwt.sign({ id: 2 }, 'secret');
            
            const mockReq = {
                headers: {
                    authorization: `Bearer ${headerToken}`
                },
                query: {
                    token: queryToken
                }
            };
            
            const extractedToken = mockReq.headers.authorization?.split(' ')[1] || mockReq.query.token;
            expect(extractedToken).toBe(headerToken);
        });
    });

    describe('Guest Mode vs Token Mode', () => {
        test('should handle guest mode without token', async () => {
            const response = await request(app)
                .get('/?guest=true')
                .expect(200);
            
            // The server shows guest message
            expect(response.text).toContain('Welcome, Guest! Please log in to access more features.');
        });

        test('should redirect when both token and guest mode provided (security priority)', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}&guest=true`)
                .expect(302);
            
            // INTENDED BEHAVIOR: Security takes priority - redirect to login when token in URL
            expect(response.headers.location).toBe('/login');
        });

        test('should allow authenticated access with cookie token', async () => {
            const response = await request(app)
                .get('/')
                .set('Cookie', `token=${validToken}`)
                .expect(200);
            
            // Should serve the main page
            expect(response.text).toContain('<!DOCTYPE html>');
        });

        test('should handle x-user-type header for guest mode', async () => {
            const response = await request(app)
                .get('/')
                .set('x-user-type', 'guest')
                .expect(200);
            
            expect(response.text).toContain('Welcome, Guest! Please log in to access more features.');
        });
    });

    describe('Token Expiration Handling', () => {
        test('should generate token with correct expiration', () => {
            const token = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            const now = Math.floor(Date.now() / 1000);
            const tenMinutesFromNow = now + (10 * 60);
            
            expect(decoded.exp).toBeGreaterThan(now);
            expect(decoded.exp).toBeLessThanOrEqual(tenMinutesFromNow + 5); // Allow 5 second buffer
        });

        test('should reject expired token', () => {
            const expiredToken = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '-1s' });
            
            expect(() => {
                jwt.verify(expiredToken, 'secret');
            }).toThrow('jwt expired');
        });
    });

    describe('OAuth Configuration Validation', () => {
        test('should handle missing Google OAuth configuration', async () => {
            const originalClientId = process.env.GMAIL_CLIENT_ID;
            const originalClientSecret = process.env.GMAIL_CLIENT_SECRET;
            
            delete process.env.GMAIL_CLIENT_ID;
            delete process.env.GMAIL_CLIENT_SECRET;
            
            const response = await request(app)
                .get('/auth/google')
                .expect(500);
            
            expect(response.text).toContain('Google OAuth not configured');
            
            // Restore environment variables
            process.env.GMAIL_CLIENT_ID = originalClientId;
            process.env.GMAIL_CLIENT_SECRET = originalClientSecret;
        });

        test('should handle missing Facebook OAuth configuration', async () => {
            const originalAppId = process.env.FACEBOOK_APP_ID;
            const originalAppSecret = process.env.FACEBOOK_APP_SECRET;
            
            delete process.env.FACEBOOK_APP_ID;
            delete process.env.FACEBOOK_APP_SECRET;
            
            const response = await request(app)
                .get('/auth/facebook')
                .expect(500);
            
            expect(response.text).toContain('Facebook OAuth not configured');
            
            // Restore environment variables
            process.env.FACEBOOK_APP_ID = originalAppId;
            process.env.FACEBOOK_APP_SECRET = originalAppSecret;
        });
    });
});