require('dotenv').config();
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const express = require('express');
const https = require('https');
const fs = require('fs');

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Function to get secret from Google Secret Manager
async function getSecret(secretName) {
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || '914087269150';
        const [version] = await secretClient.accessSecretVersion({
            name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
        });
        return version.payload.data.toString();
    } catch (error) {
        console.log(`Secret ${secretName} not found, using env variable`);
        return null;
    }
}

// Load permanent secrets at startup
async function loadPermanentSecrets() {
    process.env.GMAIL_CLIENT_ID = await getSecret('GMAIL_CLIENT_ID') || process.env.GMAIL_CLIENT_ID;
    process.env.GMAIL_CLIENT_SECRET = await getSecret('GMAIL_CLIENT_SECRET') || process.env.GMAIL_CLIENT_SECRET;
    process.env.GMAIL_REFRESH_TOKEN = await getSecret('GMAIL_REFRESH_TOKEN') || process.env.GMAIL_REFRESH_TOKEN;
    process.env.ADSENSE_CLIENT_ID = await getSecret('ADSENSE_CLIENT_ID') || process.env.ADSENSE_CLIENT_ID;
    process.env.ADSENSE_SLOT_ID = await getSecret('ADSENSE_SLOT_ID') || process.env.ADSENSE_SLOT_ID;
    process.env.FACEBOOK_APP_ID = await getSecret('FACEBOOK_APP_ID') || process.env.FACEBOOK_APP_ID;
    process.env.FACEBOOK_APP_SECRET = await getSecret('FACEBOOK_APP_SECRET') || process.env.FACEBOOK_APP_SECRET;
}

// Load conditional secrets on-demand
async function loadConditionalSecret(secretName, envVar) {
    if (!process.env[envVar]) {
        process.env[envVar] = await getSecret(secretName) || process.env[envVar];
    }
    return process.env[envVar];
}
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { evaluate, simplify } = require('mathjs');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);

// Subdomain routing middleware - must be first
app.use((req, res, next) => {
    const host = req.get('host');
    const subdomain = host.split('.')[0];
    
    if (subdomain !== 'localhost' && subdomain !== host && req.url === '/') {
        if (subdomain === 'fft') {
            req.url = '/fft-visualizer';
        } else if (subdomain === 'math') {
            req.url = '/math';
        } else if (subdomain === 'contact') {
            req.url = '/contact';
        }
    }
    
    next();
});

// Parse URL-encoded bodies and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(require('express-session')({ 
    secret: 'secret', 
    resave: false, 
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 600000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// In-memory user storage (use database in production)
const users = [];

// Admin configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'cartoonsredbob@gmail.com';

// Create admin user
const adminPassword = Math.random().toString(36).slice(-12);
bcrypt.hash(adminPassword, 10).then(hashedPassword => {
    users.push({
        id: 1,
        username: 'admin',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        subscription: 'full'
    });
    console.log(`Admin user created - Username: admin, Email: ${ADMIN_EMAIL}, Password: ${adminPassword}`);
});

// Create premium user example
const premiumPassword = Math.random().toString(36).slice(-12);
bcrypt.hash(premiumPassword, 10).then(hashedPassword => {
    users.push({
        id: 2,
        username: 'premium',
        email: 'premium@localhost',
        password: hashedPassword,
        role: 'user',
        subscription: 'premium'
    });
    console.log(`Premium user created - Username: premium, Password: ${premiumPassword}`);
});

// Passport configuration - initialize after secrets are loaded
function initializePassport() {
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
        passport.use(new GoogleStrategy({
            clientID: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            callbackURL: process.env.NODE_ENV === 'production' ? 'https://matt-resume.click/auth/google/callback' : 'https://localhost:3000/auth/google/callback'
        }, (accessToken, refreshToken, profile, done) => {
            let user = users.find(u => u.googleId === profile.id);
            if (!user) {
                const isAdmin = profile.emails[0].value === ADMIN_EMAIL;
                console.log(`Google OAuth: ${profile.emails[0].value} vs ${ADMIN_EMAIL}, isAdmin: ${isAdmin}`);
                user = { 
                    id: users.length + 1, 
                    googleId: profile.id, 
                    username: profile.displayName, 
                    email: profile.emails[0].value,
                    googlePhoto: profile.photos?.[0]?.value,
                    role: isAdmin ? 'admin' : 'user',
                    subscription: isAdmin ? 'full' : 'basic'
                };
                users.push(user);
                console.log(`Created Google user: role=${user.role}, subscription=${user.subscription}`);
            }
            return done(null, user);
        }));
    }
    
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        passport.use(new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: process.env.NODE_ENV === 'production' ? 'https://matt-resume.click/auth/facebook/callback' : 'https://localhost:3000/auth/facebook/callback',
            profileFields: ['id', 'displayName', 'photos', 'email']
        }, (accessToken, refreshToken, profile, done) => {
            let user = users.find(u => u.facebookId === profile.id);
            if (!user) {
                user = { 
                    id: users.length + 1, 
                    facebookId: profile.id, 
                    username: profile.displayName, 
                    email: profile.emails?.[0]?.value || `${profile.id}@facebook.local`,
                    facebookPhoto: profile.photos?.[0]?.value,
                    role: 'user',
                    subscription: 'basic'
                };
                users.push(user);
            }
            return done(null, user);
        }));
    }
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});

// Authentication middleware with auto-refresh
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    const isGuest = req.headers['x-user-type'] === 'guest' || req.query.guest === 'true';
    
    if (token || isGuest || req.path === '/login' || req.path === '/register' || req.path.startsWith('/auth/')) {
        return next();
    }
    
    res.redirect('/login');
}



// Math calculator route
app.get('/math', (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        res.sendFile(path.join(__dirname, 'math.html'));
    } else {
        res.render('math.html');
    }
});

// FFT Visualizer route
app.get('/fft-visualizer', (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        res.sendFile(path.join(__dirname, 'fft-visualizer.html'));
    } else {
        res.render('fft-visualizer.html');
    }
});

// Story Generator route (requires full subscription)
app.get('/story-generator', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Access denied. Full subscription required.');
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user || (user.subscription !== 'full' && user.role !== 'admin')) {
            return res.status(403).send('Access denied. Full subscription required.');
        }
        // Check if user has OpenAI key
        if (!user.openaiKey) {
            return res.redirect('/request-api-key');
        }
        res.sendFile(path.join(__dirname, 'story-generator.html'));
    } catch {
        res.status(401).send('Invalid token.');
    }
});

app.post('/story/generate', express.json(), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user || (user.subscription !== 'full' && user.role !== 'admin')) {
            return res.status(403).json({ error: 'Full subscription required' });
        }
        
        if (!user.openaiKey) {
            return res.status(400).json({ error: 'AI_KEY_MISSING', message: 'OpenAI key required for AI features' });
        }
        
        const { adjective, wordCount, subject } = req.body;
        
        // Similarity check for custom inputs
        function checkSimilarity(input, options) {
            const threshold = 0.7;
            for (const option of options) {
                const similarity = input.toLowerCase().includes(option.toLowerCase()) || option.toLowerCase().includes(input.toLowerCase());
                if (similarity) return false;
            }
            return true;
        }
        
        const knownAdjectives = ['funny', 'sweet', 'scary', 'bedtime'];
        const scarySubjects = ['unaired TV episodes', 'unaired movies', 'urban legends', 'haunted technology', 'cryptids', 'werewolves', 'zombies', 'vampires'];
        const otherSubjects = ['puppies', 'kitties', 'chickens', 'a random farm animal'];
        
        const customAdded = {};
        
        if (!knownAdjectives.includes(adjective.toLowerCase())) {
            if (!checkSimilarity(adjective, knownAdjectives)) {
                return res.status(400).json({ error: 'Custom adjective too similar to existing options' });
            }
            customAdded.adjective = adjective;
        }
        
        const allSubjects = [...scarySubjects, ...otherSubjects];
        if (!allSubjects.includes(subject)) {
            if (!checkSimilarity(subject, allSubjects)) {
                return res.status(400).json({ error: 'Custom subject too similar to existing options' });
            }
            customAdded.subject = subject;
        }
        
        const prompt = `Write a ${adjective} story in ${wordCount} words about ${subject}.`;
        
        const orgId = await loadConditionalSecret('OPENAI_ORG_ID', 'OPENAI_ORG_ID');
        const openai = new OpenAI({ 
            apiKey: user.openaiKey || process.env.OPENAI_API_KEY,
            organization: orgId
        });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: parseInt(wordCount) + 50
        });
        
        res.json({ 
            story: completion.choices[0].message.content,
            customAdded: Object.keys(customAdded).length > 0 ? customAdded : null
        });
    } catch (error) {
        console.error('OpenAI error:', error.message);
        res.status(500).json({ error: 'Story generation failed' });
    }
});

// Gmail API setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

// Contact form submission
app.post('/contact', express.json(), async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    console.log('Contact form submission:', { name, email, subject, message });
    
    if (!name || !email || !subject || !message) {
        return res.json({ success: false, message: 'All fields required' });
    }
    
    // Handle data deletion request
    if (subject === 'Data Deletion Request') {
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users.splice(userIndex, 1);
            console.log(`User data deleted for email: ${email}`);
            return res.json({ success: true, message: 'Your data has been deleted successfully.' });
        } else {
            return res.json({ success: true, message: 'No account found with that email address.' });
        }
    }
    
    try {
        console.log('Getting access token...');
        const accessToken = await oauth2Client.getAccessToken();
        console.log('Access token obtained');
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        const emailContent = [
            `From: ${process.env.GMAIL_USER}`,
            `To: ${process.env.GMAIL_USER}`,
            `Subject: Contact Form: ${subject} - ${name}`,
            '',
            `Name: ${name}`,
            `Email: ${email}`,
            `Subject: ${subject}`,
            `Message: ${message}`
        ].join('\n');
        
        const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        console.log('Sending email via Gmail API...');
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });
        
        console.log('Email sent successfully');
        
        // Send SMS notification
        const twilioSid = await loadConditionalSecret('TWILIO_ACCOUNT_SID', 'TWILIO_ACCOUNT_SID');
        const twilioToken = await loadConditionalSecret('TWILIO_AUTH_TOKEN', 'TWILIO_AUTH_TOKEN');
        if (twilioSid && twilioToken) {
            try {
                const twilioPhone = await loadConditionalSecret('TWILIO_PHONE_NUMBER', 'TWILIO_PHONE_NUMBER');
                const notificationPhone = await loadConditionalSecret('NOTIFICATION_PHONE_NUMBER', 'NOTIFICATION_PHONE_NUMBER');
                const client = twilio(twilioSid, twilioToken);
                await client.messages.create({
                    body: `New contact form submission from ${name} (${email}): ${subject}`,
                    from: twilioPhone,
                    to: notificationPhone
                });
                console.log('SMS notification sent');
            } catch (smsError) {
                console.error('SMS error:', smsError.message);
            }
        }
        
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Email error details:', error.message, error.code);
        res.json({ success: false, message: `Failed to send email: ${error.message}` });
    }
});

app.post('/math/calculate', express.json(), (req, res) => {
    const { expression } = req.body;
    
    if (!expression) {
        res.json({ result: 'Please enter an expression' });
        return;
    }
    
    try {
        const result = evaluateExpression(expression.trim());
        res.json({ result });
    } catch (error) {
        res.json({ result: 'Invalid expression' });
    }
});

function evaluateExpression(expr) {
    try {
        // Replace symbols for mathjs compatibility
        expr = expr.replace(/π/g, 'pi')
                .replace(/\blog\(/g, 'log10(')
                .replace(/ln\(/g, 'log(');
        
        // Use mathjs to evaluate the expression
        let result = evaluate(expr);
        
        // Handle complex numbers - convert to standard rectangular form
        if (result && typeof result === 'object' && result.re !== undefined) {
            let real = Math.abs(result.re) < 1e-14 ? 0 : result.re;
            let imag = Math.abs(result.im) < 1e-14 ? 0 : result.im;
            
            if (imag === 0) return real;
            if (real === 0 && imag === 1) return 'i';
            if (real === 0 && imag === -1) return '-i';
            if (real === 0) return `${imag}i`;
            if (imag === 1) return `${real} + i`;
            if (imag === -1) return `${real} - i`;
            if (imag > 0) return `${real} + ${imag}i`;
            return `${real} - ${Math.abs(imag)}i`;
        }
        
        // Handle regular numbers
        if (typeof result === 'number' && isFinite(result)) {
            // Check for common pi fractions
            const piFractions = [
                { value: Math.PI/2, display: 'π/2' },
                { value: Math.PI/3, display: 'π/3' },
                { value: Math.PI/4, display: 'π/4' },
                { value: Math.PI/6, display: 'π/6' },
                { value: Math.PI/12, display: 'π/12' }
            ];
            
            for (const fraction of piFractions) {
                if (Math.abs(result - fraction.value) < 1e-14) {
                    return fraction.display;
                }
            }
            
            const rounded = Math.round(result);
            if (Math.abs(result - rounded) < 1e-14) {
                return rounded;
            }
            return Math.round(result * 1e15) / 1e15;
        }
        
        return result;
    } catch (error) {
        // Try to simplify symbolic expressions
        try {
            return simplify(expr).toString();
        } catch (simplifyError) {
            return expr;
        }
    }
}





// Auth routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/auth/register', express.json(), async (req, res) => {
    const { username, email, password } = req.body;
    
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'Username already exists' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let openaiKey = null;
        
        // Generate OpenAI key if master API key is available
        const masterApiKey = await loadConditionalSecret('OPENAI_MASTER_API_KEY', 'OPENAI_MASTER_API_KEY');
        const orgId = await loadConditionalSecret('OPENAI_ORG_ID', 'OPENAI_ORG_ID');
        if (masterApiKey && orgId) {
            try {
                const openai = new OpenAI({ 
                    apiKey: masterApiKey,
                    organization: orgId 
                });
                const apiKey = await openai.apiKeys.create({
                    name: `User-${username}-${Date.now()}`
                });
                openaiKey = apiKey.key;
            } catch (keyError) {
                console.log('OpenAI key generation skipped:', keyError.message);
            }
        }
        
        const user = { 
            id: users.length + 1, 
            username, 
            email, 
            password: hashedPassword,
            role: 'user',
            subscription: 'basic',
            openaiKey
        };
        users.push(user);
        
        const message = openaiKey ? 
            'Registration successful' : 
            'Registration successful. Note: AI features are currently unavailable due to a technical issue.';
        res.json({ success: true, message, aiFeatures: !!openaiKey });
    } catch (error) {
        console.error('Registration failed:', error.message);
        res.json({ success: false, message: 'Registration failed' });
    }
});

app.post('/auth/login', express.json(), async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1h' });
    res.json({ success: true, token });
});

app.get('/auth/google', (req, res, next) => {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        return res.status(500).send('Google OAuth not configured');
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    const token = jwt.sign({ id: req.user.id }, 'secret', { expiresIn: '1h' });
    console.log('Google OAuth success, token generated:', token.substring(0, 20) + '...');
    res.redirect('/login?success=true');
});

app.get('/auth/facebook', (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
        return res.status(500).send('Facebook OAuth not configured');
    }
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    const token = jwt.sign({ id: req.user.id }, 'secret', { expiresIn: '1h' });
    res.redirect('/login?success=true');
});

app.get('/auth/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                role: user.role,
                subscription: user.subscription,
                hideAds: user.subscription === 'premium' || user.subscription === 'full',
                googlePhoto: user.googlePhoto,
                facebookPhoto: user.facebookPhoto,
                openaiKey: user.openaiKey
            } 
        });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/request-api-key', (req, res) => {
    res.sendFile(path.join(__dirname, 'request-api-key.html'));
});

app.post('/auth/request-api-key', express.json(), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Try to generate OpenAI key
        const masterApiKey = await loadConditionalSecret('OPENAI_MASTER_API_KEY', 'OPENAI_MASTER_API_KEY');
        const orgId = await loadConditionalSecret('OPENAI_ORG_ID', 'OPENAI_ORG_ID');
        
        if (masterApiKey && orgId) {
            try {
                const openai = new OpenAI({ 
                    apiKey: masterApiKey,
                    organization: orgId 
                });
                const apiKey = await openai.apiKeys.create({
                    name: `User-${user.username}-${Date.now()}`
                });
                user.openaiKey = apiKey.key;
                res.json({ success: true, message: 'AI access granted! You can now use AI features.' });
            } catch (keyError) {
                res.json({ success: false, message: 'AI access request failed. Please try again later.' });
            }
        } else {
            res.json({ success: false, message: 'AI services are currently unavailable. Please contact support.' });
        }
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/auth/refresh', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        const decoded = jwt.verify(token, 'secret', { ignoreExpiration: true });
        const user = users.find(u => u.id === decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Check if token is within refresh window (allow refresh up to 24h after expiration)
        const now = Math.floor(Date.now() / 1000);
        const refreshWindow = 24 * 60 * 60; // 24 hours
        if (decoded.exp && (now - decoded.exp) > refreshWindow) {
            return res.status(401).json({ error: 'Token too old to refresh' });
        }
        
        const newToken = jwt.sign({ id: user.id }, 'secret', { expiresIn: '1h' });
        res.json({ token: newToken });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Contact route
app.get('/contact', (req, res) => {
    if (process.env.NODE_ENV === 'test') {
        res.sendFile(path.join(__dirname, 'contact.html'));
    } else {
        res.render('contact.html');
    }
});

// Privacy Policy route
app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy-policy.html'));
});

// Archived Privacy Policy route
app.get('/privacy-policy/archive/:filename', (req, res) => {
    const filename = req.params.filename;
    const archivePath = path.join(__dirname, 'archives', filename);
    
    if (fs.existsSync(archivePath)) {
        res.sendFile(archivePath);
    } else {
        // Return list of all archived policies
        const archiveDir = path.join(__dirname, 'archives');
        if (fs.existsSync(archiveDir)) {
            const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.html'));
            const fileList = files.map(f => `<li><a href="/privacy-policy/archive/${f}">${f}</a></li>`).join('');
            
            res.status(404).send(`
                <h1>Archived Privacy Policies</h1>
                <p>The requested archive was not found. Available archived versions:</p>
                <ul>${fileList}</ul>
                <p><a href="/privacy-policy">View Current Privacy Policy</a></p>
            `);
        } else {
            res.status(404).send('No archived versions available');
        }
    }
});

// Store last known privacy policy content
let lastPrivacyPolicyContent = '';

// Initialize privacy policy monitoring
function initializePolicyMonitoring() {
    const policyPath = path.join(__dirname, 'privacy-policy.html');
    if (fs.existsSync(policyPath)) {
        lastPrivacyPolicyContent = fs.readFileSync(policyPath, 'utf8');
    }
    
    // Watch for file changes
    fs.watchFile(policyPath, async (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            await handlePolicyUpdate();
        }
    });
}

// Handle automatic policy update
async function handlePolicyUpdate() {
    const policyPath = path.join(__dirname, 'privacy-policy.html');
    const currentContent = fs.readFileSync(policyPath, 'utf8');
    
    if (currentContent !== lastPrivacyPolicyContent && lastPrivacyPolicyContent) {
        // Archive previous version
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFilename = `privacy-policy-${timestamp}.html`;
        const archivePath = path.join(__dirname, 'archives', archiveFilename);
        
        // Create archives directory if it doesn't exist
        const archiveDir = path.join(__dirname, 'archives');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir);
        }
        
        // Save previous version to archive
        fs.writeFileSync(archivePath, lastPrivacyPolicyContent);
        console.log(`Privacy policy archived: ${archiveFilename}`);
        
        // Generate AI summary and notify users
        try {
            const orgId = await loadConditionalSecret('OPENAI_ORG_ID', 'OPENAI_ORG_ID');
            const openai = new OpenAI({ 
                apiKey: process.env.OPENAI_API_KEY,
                organization: orgId
            });
            
            const prompt = `Compare these two privacy policy versions and summarize the key changes in 2-3 bullet points:\n\nOLD VERSION:\n${lastPrivacyPolicyContent}\n\nNEW VERSION:\n${currentContent}`;
            
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200
            });
            
            const changesSummary = completion.choices[0].message.content;
            
            // Send notifications to all users
            const userEmails = users.filter(u => u.email).map(u => u.email);
            let successCount = 0;
            
            for (const email of userEmails) {
                try {
                    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                    
                    const emailContent = [
                        `From: ${process.env.GMAIL_USER}`,
                        `To: ${email}`,
                        `Subject: Privacy Policy Update - Matt Powers`,
                        '',
                        `Dear User,`,
                        '',
                        `We have updated our Privacy Policy. Here's what changed:`,
                        '',
                        changesSummary,
                        '',
                        `Compare versions:`,
                        `Previous version: https://matt-resume.click/privacy-policy/archive/${archiveFilename}`,
                        `Current version: https://matt-resume.click/privacy-policy`,
                        '',
                        `Best regards,`,
                        `Matt Powers Team`
                    ].join('\n');
                    
                    const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    
                    await gmail.users.messages.send({
                        userId: 'me',
                        requestBody: { raw: encodedEmail }
                    });
                    
                    successCount++;
                } catch (emailError) {
                    console.error(`Failed to send to ${email}:`, emailError.message);
                }
            }
            
            console.log(`Privacy policy update notifications sent to ${successCount} users`);
        } catch (error) {
            console.error('Failed to generate summary or send notifications:', error.message);
        }
    }
    
    // Update stored content
    lastPrivacyPolicyContent = currentContent;
}

// Direct Data Deletion Route
app.post('/delete-my-data', express.json(), async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        console.log(`User data deleted for email: ${email}`);
        res.json({ success: true, message: 'Your data has been deleted successfully.' });
    } else {
        res.json({ success: true, message: 'No account found with that email address.' });
    }
});

// Admin Configuration
app.post('/admin/set-email', express.json(), (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        process.env.ADMIN_EMAIL = email;
        res.json({ success: true, message: `Admin email set to ${email}` });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Privacy Policy Change Detection
app.post('/privacy-policy/detect-changes', express.json(), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Read current privacy policy content
        const currentContent = fs.readFileSync(path.join(__dirname, 'privacy-policy.html'), 'utf8');
        
        if (!lastPrivacyPolicyContent) {
            lastPrivacyPolicyContent = currentContent;
            return res.json({ success: true, message: 'Baseline privacy policy content saved' });
        }
        
        if (currentContent === lastPrivacyPolicyContent) {
            return res.json({ success: true, message: 'No changes detected in privacy policy' });
        }
        
        // Generate AI summary of changes
        const orgId = await loadConditionalSecret('OPENAI_ORG_ID', 'OPENAI_ORG_ID');
        const openai = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY,
            organization: orgId
        });
        
        const prompt = `Compare these two privacy policy versions and summarize the key changes in 2-3 bullet points:\n\nOLD VERSION:\n${lastPrivacyPolicyContent}\n\nNEW VERSION:\n${currentContent}`;
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200
        });
        
        const changesSummary = completion.choices[0].message.content;
        
        // Archive previous version
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFilename = `privacy-policy-${timestamp}.html`;
        const archivePath = path.join(__dirname, 'archives', archiveFilename);
        
        // Create archives directory if it doesn't exist
        const archiveDir = path.join(__dirname, 'archives');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir);
        }
        
        // Save previous version to archive
        fs.writeFileSync(archivePath, lastPrivacyPolicyContent);
        
        // Send notifications to all users
        const userEmails = users.filter(u => u.email).map(u => u.email);
        let successCount = 0;
        
        for (const email of userEmails) {
            try {
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                
                const emailContent = [
                    `From: ${process.env.GMAIL_USER}`,
                    `To: ${email}`,
                    `Subject: Privacy Policy Update - Matt Powers`,
                    '',
                    `Dear User,`,
                    '',
                    `We have updated our Privacy Policy. Here's what changed:`,
                    '',
                    changesSummary,
                    '',
                    `Compare versions:`,
                    `Previous version: ${req.get('origin')}/privacy-policy/archive/${archiveFilename}`,
                    `Current version: ${req.get('origin')}/privacy-policy`,
                    '',
                    `Best regards,`,
                    `Matt Powers Team`
                ].join('\n');
                
                const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                
                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: encodedEmail }
                });
                
                successCount++;
            } catch (emailError) {
                console.error(`Failed to send to ${email}:`, emailError.message);
            }
        }
        
        // Update stored content
        lastPrivacyPolicyContent = currentContent;
        
        res.json({ 
            success: true, 
            message: `Privacy policy changes detected and notifications sent to ${successCount} users` 
        });
    } catch (error) {
        console.error('Change detection error:', error.message);
        res.status(500).json({ error: 'Failed to detect changes' });
    }
});

// Root route serves main page
app.get('/', (req, res) => {
    const authToken = req.headers.authorization?.split(' ')[1];
    const isGuest = req.headers['x-user-type'] === 'guest' || req.query.guest === 'true';
    
    // Check if user is authenticated or guest
    const isAuthenticated = authToken || isGuest;
    
    if (!isAuthenticated) {
        return res.redirect('/login');
    }
    
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.send(html);
});

// Serve static files (exclude auth paths)
app.use((req, res, next) => {
    if (req.path.startsWith('/auth/')) {
        return next();
    }
    express.static('.', { index: false })(req, res, next);
});

// Redirect to login for all other GET routes (not POST routes)
app.get('*', (req, res) => {
    res.redirect('/login');
});

if (process.env.NODE_ENV !== 'test') {
    loadPermanentSecrets().then(() => {
        initializePassport();
        initializePolicyMonitoring();
        
        const startServer = (port) => {
            try {
                const options = {
                    key: fs.readFileSync('server.key'),
                    cert: fs.readFileSync('server.cert')
                };
                https.createServer(options, app).listen(port, () => {
                    console.log(`HTTPS Server running on https://localhost:${port}`);
                }).on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.log(`Port ${port} in use, trying ${port + 1}`);
                        startServer(port + 1);
                    }
                });
            } catch (error) {
                console.log('HTTPS certificates not found, starting HTTP server');
                app.listen(port, () => {
                    console.log(`HTTP Server running on http://localhost:${port}`);
                }).on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.log(`Port ${port} in use, trying ${port + 1}`);
                        startServer(port + 1);
                    }
                });
            }
        };
        
        startServer(PORT);
    }).catch(console.error);
}

module.exports = app;
module.exports.evaluateExpression = evaluateExpression;