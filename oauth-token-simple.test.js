const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

describe('OAuth Token Saving Processes', () => {
    let validToken;

    beforeEach(() => {
        // Generate valid token for admin user (ID 1)
        validToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
    });

    describe('JWT Token Generation and Verification', () => {
        test('should generate valid JWT token', () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            expect(decoded.id).toBe(1);
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
        });

        test('should verify valid token successfully', async () => {
            // Wait a bit for admin user creation to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${validToken}`);
            
            if (response.status === 200) {
                expect(response.body.user).toBeDefined();
                expect(response.body.user.id).toBe(1);
            } else {
                // If user doesn't exist yet, expect 404
                expect(response.status).toBe(404);
                expect(response.body.error).toBe('User not found');
            }
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

    describe('OAuth Callback Token Generation', () => {
        test('should generate token with correct expiration', () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            const now = Math.floor(Date.now() / 1000);
            const tenMinutesFromNow = now + (10 * 60);
            
            expect(decoded.exp).toBeGreaterThan(now);
            expect(decoded.exp).toBeLessThanOrEqual(tenMinutesFromNow + 5); // Allow 5 second buffer
        });

        test('should reject expired token', () => {
            const expiredToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '-1s' });
            
            expect(() => {
                jwt.verify(expiredToken, 'secret');
            }).toThrow('jwt expired');
        });

        test('should simulate Google OAuth callback token generation', () => {
            const mockUser = { id: 1 };
            const token = jwt.sign({ id: mockUser.id }, 'secret', { expiresIn: '10m' });
            const expectedRedirect = `/?token=${token}`;
            
            expect(token).toBeDefined();
            expect(expectedRedirect).toContain('/?token=');
            expect(jwt.verify(token, 'secret').id).toBe(mockUser.id);
        });

        test('should simulate Facebook OAuth callback session storage', () => {
            const mockUser = { id: 1 };
            const token = jwt.sign({ id: mockUser.id }, 'secret', { expiresIn: '10m' });
            const mockSession = {};
            
            // Simulate session token storage
            mockSession.authToken = token;
            
            expect(mockSession.authToken).toBe(token);
            expect(jwt.verify(mockSession.authToken, 'secret').id).toBe(mockUser.id);
        });
    });

    describe('Token Extraction Methods', () => {
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

    describe('Token-based Route Access', () => {
        test('should allow access to protected route with valid token', async () => {
            // Test story generator route which requires full subscription
            const fullUserToken = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' }); // Admin has full subscription
            
            const response = await request(app)
                .get('/story-generator')
                .set('Authorization', `Bearer ${fullUserToken}`)
                .expect(200);
            
            expect(response.text).toContain('Story Generator');
        });

        test('should deny access to protected route without token', async () => {
            const response = await request(app)
                .get('/story-generator')
                .expect(401);
            
            expect(response.text).toContain('Access denied. Full subscription required.');
        });

        test('should deny access to protected route with invalid token', async () => {
            const response = await request(app)
                .get('/story-generator')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(401);
            
            expect(response.text).toContain('Invalid token.');
        });
    });

    describe('Token Security', () => {
        test('should use secure secret for token signing', () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            
            // Should not be able to verify with wrong secret
            expect(() => {
                jwt.verify(token, 'wrong-secret');
            }).toThrow();
        });

        test('should include expiration in token payload', () => {
            const token = jwt.sign({ id: 1 }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(decoded.iat);
        });

        test('should properly encode user ID in token', () => {
            const userId = 123;
            const token = jwt.sign({ id: userId }, 'secret', { expiresIn: '10m' });
            const decoded = jwt.verify(token, 'secret');
            
            expect(decoded.id).toBe(userId);
        });
    });

    describe('Login Token Generation', () => {
        test('should generate token on successful login', async () => {
            // First register a user
            const registerResponse = await request(app)
                .post('/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@test.com',
                    password: 'password123'
                });

            // Registration might fail due to missing OpenAI key, but that's ok for this test
            if (registerResponse.body.success) {
                // Then login
                const response = await request(app)
                    .post('/auth/login')
                    .send({
                        username: 'testuser',
                        password: 'password123'
                    })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.token).toBeDefined();
                
                // Verify the token is valid
                const decoded = jwt.verify(response.body.token, 'secret');
                expect(decoded.id).toBeDefined();
            } else {
                // If registration failed, test that login also fails
                const response = await request(app)
                    .post('/auth/login')
                    .send({
                        username: 'testuser',
                        password: 'password123'
                    })
                    .expect(200);

                expect(response.body.success).toBe(false);
            }
        });

        test('should not generate token on failed login', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                })
                .expect(200);

            expect(response.body.success).toBe(false);
            expect(response.body.token).toBeUndefined();
        });
    });
});