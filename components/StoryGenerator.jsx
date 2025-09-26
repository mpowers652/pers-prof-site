import React, { useState, useEffect } from 'react';

const StoryGenerator = ({ 
    user = null, 
    className = '', 
    style = {},
    showTitle = true,
    compact = false 
}) => {
    const [adjective, setAdjective] = useState('');
    const [customAdjective, setCustomAdjective] = useState('');
    const [wordCount, setWordCount] = useState('');
    const [customWordCount, setCustomWordCount] = useState('');
    const [subject, setSubject] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [story, setStory] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const subjects = {
        funny: ['clown', 'banana', 'robot', 'penguin'],
        sweet: ['puppy', 'kitten', 'butterfly', 'rainbow'],
        scary: ['ghost', 'monster', 'vampire', 'werewolf'],
        bedtime: ['moon', 'star', 'dream', 'pillow']
    };

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

    if (!hasAccess) {
        return (
            <div className={`story-generator access-denied ${className}`} style={style}>
                {showTitle && <h3>🔒 Story Generator</h3>}
                <p>This feature requires a full subscription.</p>
                <a href="/subscription" className="btn">Upgrade Now</a>
            </div>
        );
    }

    return (
        <div className={`story-generator ${className}`} style={style}>
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
                    >
                        <option value="">Select word count...</option>
                        <option value="200">200</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
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
                    >
                        <option value="">Select subject...</option>
                        {adjective && subjects[adjective] && 
                            subjects[adjective].map(subj => (
                                <option key={subj} value={subj}>{subj}</option>
                            ))
                        }
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
        </div>
    );
};

export default StoryGenerator;