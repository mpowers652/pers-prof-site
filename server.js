require('dotenv').config();
const express = require('express');
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

// Serve static files
app.use(express.static('.'));
app.use(require('express-session')({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// In-memory user storage (use database in production)
const users = [];

// Create admin user
const adminPassword = Math.random().toString(36).slice(-12);
bcrypt.hash(adminPassword, 10).then(hashedPassword => {
    users.push({
        id: 1,
        username: 'admin',
        email: 'admin@localhost',
        password: hashedPassword,
        role: 'admin',
        subscription: 'full'
    });
    console.log(`Admin user created - Username: admin, Password: ${adminPassword}`);
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

// Passport configuration
if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => {
    let user = users.find(u => u.googleId === profile.id);
    if (!user) {
        user = { id: users.length + 1, googleId: profile.id, username: profile.displayName, email: profile.emails[0].value };
        users.push(user);
    }
    return done(null, user);
    }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});

// Authentication middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
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
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    if (!token) return res.status(401).send('Access denied. Full subscription required.');
    
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = users.find(u => u.id === decoded.id);
        if (!user || user.subscription !== 'full') {
            return res.status(403).send('Access denied. Full subscription required.');
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
        if (!user || user.subscription !== 'full') {
            return res.status(403).json({ error: 'Full subscription required' });
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
        
        const openai = new OpenAI({ 
            apiKey: user.openaiKey || process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID
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
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await client.messages.create({
                    body: `New contact form submission from ${name} (${email}): ${subject}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: process.env.NOTIFICATION_PHONE_NUMBER
                });
                console.log('SMS notification sent');
            } catch (smsError) {
                console.error('SMS error:', smsError.message);
            }
        }
        
        res.json({ success: true, message: 'Email sent successfully!' });
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
        // Generate OpenAI API key for user
        const openai = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY,
            organization: process.env.OPENAI_ORG_ID
        });
        
        const apiKey = await openai.apiKeys.create({
            name: `User-${username}-${Date.now()}`
        });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { 
            id: users.length + 1, 
            username, 
            email, 
            password: hashedPassword, 
            openaiKey: apiKey.key
        };
        users.push(user);
        
        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('OpenAI key generation failed:', error.message);
        res.json({ success: false, message: 'Registration failed' });
    }
});

app.post('/auth/login', express.json(), async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id }, 'secret', { expiresIn: '10m' });
    res.json({ success: true, token });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    const token = jwt.sign({ id: req.user.id }, 'secret', { expiresIn: '10m' });
    res.redirect(`/?token=${token}`);
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
                subscription: user.subscription,
                hideAds: user.subscription === 'premium' || user.subscription === 'full'
            } 
        });
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

// Root route redirects to login or serves main page for guests
app.get('/', (req, res) => {
    const isGuest = req.headers['x-user-type'] === 'guest' || req.query.guest === 'true';
    if (isGuest) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// Apply auth middleware to all routes except auth routes
app.use(requireAuth);

// Redirect to login for all other routes
app.get('*', (req, res) => {
    res.redirect('/login');
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
module.exports.evaluateExpression = evaluateExpression;