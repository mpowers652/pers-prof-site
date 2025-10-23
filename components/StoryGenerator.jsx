import React, { useState, useEffect } from 'react';

const StoryGenerator = ({ 
    user: initialUser = null, 
    className = '', 
    style = {},
    showTitle = true,
    compact = false 
}) => {
    const [user, setUser] = useState(initialUser);
    const [userLoading, setUserLoading] = useState(!initialUser);
    const [adjective, setAdjective] = useState('');
    const [customAdjective, setCustomAdjective] = useState('');
    const [wordCount, setWordCount] = useState('');
    const [customWordCount, setCustomWordCount] = useState('');
    const [subject, setSubject] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [story, setStory] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const [isResizing, setIsResizing] = useState(false);

    const wordCounts = ['200', '500', '1000', '1500', '2000', '2500', '3000', '4000', '5000', '7000', '8000', '10000'];
    
    const subjects = {
        funny: ['clown', 'banana', 'robot', 'penguin'],
        sweet: ['puppies', 'kitties', 'chickens', 'a random farm animal'],
        scary: ['unaired TV episodes', 'unaired movies', 'unaired audio', 'missing mascots and characters from shows and movies coming to life and becoming hostile', 'TV or movie characters become real and hostile', 'urban legends', 'haunted technology', 'psychological issues such as dementia, schizophrenia or mania', 'supernatural entities, otherworldly in nature', 'cryptids', 'werewolves', 'mothman', 'skinwalkers', 'murderous cannibal neighbors', 'zombies', 'loch ness monster', 'the Rake', 'a random mythological creature come to life', 'alternate reality', 'an SCP entity or the foundation itself', 'creepypasta creatures or personas', 'possessed animals', 'cursed creature areas', 'imaginary friend becomes evil', 'time loop', 'Eyeless Jack', 'a haunted area', 'ghosts', 'leviathans similar to those shown in the Supernatural series', 'vampires', 'malicious local inhabitants', 'lost and found alien technology'],
        bedtime: ['moon', 'star', 'dream', 'pillow']
    };

    // Check user status on component mount
    useEffect(() => {
        const checkUserStatus = async () => {
            if (initialUser) {
                setUser(initialUser);
                setUserLoading(false);
                return;
            }

            // Check if user is available globally
            if (window.currentUser) {
                setUser(window.currentUser);
                setUserLoading(false);
                return;
            }

            try {
                // Verify authentication with server
                const response = await fetch('/auth/verify', {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const userData = data.user || data;
                    setUser(userData);
                    window.currentUser = userData;
                } else {
                    console.log('StoryGenerator: User not authenticated');
                    setUser(null);
                }
            } catch (error) {
                console.error('StoryGenerator: Auth verification failed:', error);
                setUser(null);
            } finally {
                setUserLoading(false);
            }
        };

        checkUserStatus();
    }, [initialUser]);

    // Listen for auth updates
    useEffect(() => {
        const handleAuthUpdate = (event) => {
            if (event.detail && event.detail.user) {
                setUser(event.detail.user);
            } else if (window.currentUser) {
                setUser(window.currentUser);
            }
        };

        window.addEventListener('auth:updated', handleAuthUpdate);
        return () => window.removeEventListener('auth:updated', handleAuthUpdate);
    }, []);

    const hasAccess = user && (user.subscription === 'full' || user.role === 'admin');

    const handleAdjectiveChange = (value) => {
        setAdjective(value);
        setSubject(''); // Reset subject when adjective changes
    };

    const getFormValues = () => {
        return {
            adjective: adjective === 'custom' ? customAdjective : adjective,
            wordCount: wordCount === 'custom' ? customWordCount : wordCount,
            subject: subject === 'custom' ? customSubject : subject
        };
    };

    const generateStory = async () => {
        const values = getFormValues();
        
        if (!values.adjective || !values.wordCount || !values.subject) {
            setError('Please fill in all fields');
            return;
        }

        if (!hasAccess) {
            setError('Story Generator requires a full subscription');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('/story/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.error) {
                setError(data.error);
            } else {
                setStory(data.story);
            }
        } catch (err) {
            console.error('Story generation error:', err);
            setError('Failed to generate story. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (userLoading) {
        return (
            <div className={`story-generator loading ${className}`} style={style}>
                {showTitle && <h3>📚 Story Generator</h3>}
                <p>Checking access...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={`story-generator access-denied ${className}`} style={style}>
                {showTitle && <h3>🔒 Story Generator</h3>}
                <p>Please log in to access the Story Generator.</p>
                <a href="/login" className="btn">Log In</a>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={`story-generator access-denied ${className}`} style={style}>
                {showTitle && <h3>🔒 Story Generator</h3>}
                <p>This feature requires a full subscription.</p>
                <p>Current subscription: {user.subscription || 'basic'}</p>
                <a href="/subscription" className="btn">Upgrade Now</a>
            </div>
        );
    }

    const handleMouseDown = (direction) => (e) => {
        e.preventDefault();
        setIsResizing(true);
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = dimensions.width;
        const startHeight = dimensions.height;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            setDimensions(prev => {
                let newWidth = prev.width;
                let newHeight = prev.height;
                
                if (direction === 'right') {
                    newWidth = Math.min(window.innerWidth - 40, Math.max(300, startWidth + deltaX));
                    document.querySelector('.story-generator').style.width = `${newWidth}px`;
                }
                if (direction === 'bottom') {
                    newHeight = Math.max(200, startHeight + deltaY);
                }
                
                return { width: newWidth, height: newHeight };
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div 
            className={`story-generator left-justify-options ${className} ${isResizing ? 'resizing' : ''}`} 
            style={{ ...style, width: `${dimensions.width}px`, minHeight: `${dimensions.height}px`, position: 'relative', overflow: 'visible', maxWidth: 'none' }}
        >
            {showTitle && <h3>📚 Story Generator</h3>}
            
            <div className={`story-controls ${compact ? 'compact' : ''}`}>
                <div className="control-group">
                    <select 
                        value={adjective} 
                        onChange={(e) => handleAdjectiveChange(e.target.value)}
                        title="adjective"
                    >
                        <option value="">Select adjective...</option>
                        <option value="funny">Funny</option>
                        <option value="sweet">Sweet</option>
                        <option value="scary">Scary</option>
                        <option value="bedtime">Bedtime</option>
                        <option value="custom">Custom...</option>
                    </select>
                    
                    {adjective === 'custom' && (
                        <input
                            type="text"
                            value={customAdjective}
                            onChange={(e) => setCustomAdjective(e.target.value)}
                            placeholder="Enter custom adjective"
                        />
                    )}
                </div>

                <div className="control-group">
                    <select 
                        value={wordCount} 
                        onChange={(e) => setWordCount(e.target.value)}
                        title="wordCount"
                        size="4"
                        className="scrollable-dropdown"
                    >
                        <option value="">Select word count...</option>
                        {wordCounts.map(count => (
                            <option key={count} value={count}>{count}</option>
                        ))}
                        <option value="custom">Custom...</option>
                    </select>
                    
                    {wordCount === 'custom' && (
                        <input
                            type="number"
                            value={customWordCount}
                            onChange={(e) => setCustomWordCount(e.target.value)}
                            placeholder="Enter word count"
                        />
                    )}
                </div>

                <div className="control-group">
                    <select 
                        value={subject} 
                        onChange={(e) => setSubject(e.target.value)}
                        title="subject"
                        size="4"
                        className="scrollable-dropdown"
                    >
                        <option value="">Select subject...</option>
                        {subjects[adjective]?.map(subj => (
                            <option key={subj} value={subj}>{subj}</option>
                        ))}
                        <option value="custom">Custom...</option>
                    </select>
                    
                    {subject === 'custom' && (
                        <input
                            type="text"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Enter custom subject"
                        />
                    )}
                </div>

                <button 
                    onClick={generateStory} 
                    disabled={loading}
                    className="btn generate-btn"
                >
                    {loading ? 'Generating...' : 'Generate Story'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            
            {story && (
                <div className="story-display">
                    <h4>Your Story:</h4>
                    <div className="story-text">{story}</div>
                </div>
            )}
            
            {/* Resize handles */}
            <button 
                className="resize-handle resize-right" 
                onMouseDown={handleMouseDown('right')}
                aria-label="Drag to resize width"
            ></button>
            <button 
                className="resize-handle resize-bottom" 
                onMouseDown={handleMouseDown('bottom')}
                aria-label="Drag to resize height"
            ></button>
        </div>
    );
};

export default StoryGenerator;