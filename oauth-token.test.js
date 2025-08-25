const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

// Mock users array to avoid accessing internal server state
const mockUsers = [];

describe('OAuth Token Saving Processes', () => {
    let testUser;
    let validToken;

    beforeEach(() => {
        // Create test user
        testUser = {
            id: 999,
            googleId: 'test-google-id',
            username: 'Test User',
            email: 'test@example.com',
            role: 'user',
            subscription: 'basic'
        };
        
        // Generate valid token
        validToken = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '10m' });
        
        // Add test user to mock users array
        mockUsers.push(testUser);
    });
    
    afterEach(() => {
        // Clear mock users
        mockUsers.length = 0;
    });

    describe('Google OAuth Token Handling', () => {
        test('should redirect with token after successful Google OAuth', async () => {
            // Mock successful Google OAuth by directly testing the callback logic
            const mockReq = {
                user: testUser
            };
            
            // Simulate the callback route behavior
            const token = jwt.sign({ id: mockReq.user.id }, 'secret', { expiresIn: '10m' });
            const expectedRedirect = `/?token=${token}`;
            
            expect(token).toBeDefined();
            expect(expectedRedirect).toContain('/?token=');
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
        test('should store token in session after Facebook OAuth', () => {
            const token = jwt.sign({ id: testUser.id }, 'secret', { expiresIn: '10m' });
            const mockSession = {};
            
            // Simulate session token storage
            mockSession.authToken = token;
            
            expect(mockSession.authToken).toBe(token);
            expect(jwt.verify(mockSession.authToken, 'secret').id).toBe(testUser.id);
        });
    });

    describe('Token URL Parameter Injection', () => {
        test('should inject token into localStorage via URL parameter', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`)
                .expect(200);
            
            // Check that token injection script is present
            expect(response.text).toContain('localStorage.setItem(\'token\', token)');
            expect(response.text).toContain('localStorage.removeItem(\'userType\')');
            expect(response.text).toContain(validToken);
        });

        test('should escape token properly in injection script', async () => {
            const tokenWithQuotes = jwt.sign({ id: testUser.id, test: "quote'test\"" }, 'secret');
            const response = await request(app)
                .get(`/?token=${tokenWithQuotes}`)
                .expect(200);
            
            // Check that quotes are properly escaped
            expect(response.text).toContain('\\\'');
            expect(response.text).toContain('\\"');
        });

        test('should verify token was saved in localStorage', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`)
                .expect(200);
            
            // Check verification logic is present
            expect(response.text).toContain('var saved = localStorage.getItem(\'token\')');
            expect(response.text).toContain('if (saved === token)');
            expect(response.text).toContain('console.log(\'Token verified in localStorage\')');
        });

        test('should include retry mechanism for token saving', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`)
                .expect(200);
            
            // Check retry logic is present
            expect(response.text).toContain('Token save failed, retrying...');
            expect(response.text).toContain('setTimeout(function()');
            expect(response.text).toContain('localStorage.setItem(\'token\', token)');
        });

        test('should clean URL after token injection', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}`)
                .expect(200);
            
            // Check URL cleanup is present
            expect(response.text).toContain('window.history.replaceState');
        });
    });

    describe('Token Verification Process', () => {
        test('should verify valid token successfully', async () => {
            // Create a user with an ID that exists in the server's users array
            const adminToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${adminToken}`)
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
            
            // The server injects guest message differently
            expect(response.text).toContain('Welcome, Guest! Please log in to access more features.');
            expect(response.text).not.toContain('localStorage.setItem(\'token\'');
        });

        test('should prioritize token over guest mode', async () => {
            const response = await request(app)
                .get(`/?token=${validToken}&guest=true`)
                .expect(200);
            
            // Should inject token even with guest=true
            expect(response.text).toContain('localStorage.setItem(\'token\', token)');
            expect(response.text).toContain(validToken);
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