/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoryGenerator from './StoryGenerator';

// Mock fetch
global.fetch = jest.fn();

describe('StoryGenerator Component', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    test('renders access denied for users without full subscription', () => {
        const user = { subscription: 'basic', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        expect(screen.getByText('🔒 Story Generator')).toBeInTheDocument();
        expect(screen.getByText('This feature requires a full subscription.')).toBeInTheDocument();
        expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
    });

    test('renders full interface for admin users', () => {
        const user = { subscription: 'basic', role: 'admin' };
        render(<StoryGenerator user={user} />);
        
        expect(screen.getByText('📚 Story Generator')).toBeInTheDocument();
        expect(screen.getByDisplayValue('')).toBeInTheDocument(); // adjective select
        expect(screen.getByText('Generate Story')).toBeInTheDocument();
    });

    test('renders full interface for users with full subscription', () => {
        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        expect(screen.getByText('📚 Story Generator')).toBeInTheDocument();
        expect(screen.getByText('Generate Story')).toBeInTheDocument();
    });

    test('updates subject options when adjective changes', () => {
        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        const adjectiveSelect = screen.getByTitle('adjective');
        fireEvent.change(adjectiveSelect, { target: { value: 'scary' } });
        
        const subjectSelect = screen.getByTitle('subject');
        expect(subjectSelect).toContainHTML('<option value="ghost">ghost</option>');
        expect(subjectSelect).toContainHTML('<option value="monster">monster</option>');
    });

    test('shows custom input when custom option is selected', () => {
        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        const adjectiveSelect = screen.getByTitle('adjective');
        fireEvent.change(adjectiveSelect, { target: { value: 'custom' } });
        
        expect(screen.getByPlaceholderText('Enter custom adjective')).toBeInTheDocument();
    });

    test('shows error when trying to generate without all fields', async () => {
        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        const generateButton = screen.getByText('Generate Story');
        fireEvent.click(generateButton);
        
        await waitFor(() => {
            expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
        });
    });

    test('calls API when all fields are filled', async () => {
        fetch.mockResolvedValueOnce({
            json: async () => ({ story: 'Test story content' })
        });

        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        // Fill out form
        fireEvent.change(screen.getByTitle('adjective'), { target: { value: 'funny' } });
        fireEvent.change(screen.getByTitle('wordCount'), { target: { value: '200' } });
        fireEvent.change(screen.getByTitle('subject'), { target: { value: 'clown' } });
        
        const generateButton = screen.getByText('Generate Story');
        fireEvent.click(generateButton);
        
        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/story/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adjective: 'funny',
                    wordCount: '200',
                    subject: 'clown'
                }),
                credentials: 'include'
            });
        });
    });

    test('displays generated story', async () => {
        fetch.mockResolvedValueOnce({
            json: async () => ({ story: 'Once upon a time, there was a funny clown...' })
        });

        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        // Fill out form
        fireEvent.change(screen.getByTitle('adjective'), { target: { value: 'funny' } });
        fireEvent.change(screen.getByTitle('wordCount'), { target: { value: '200' } });
        fireEvent.change(screen.getByTitle('subject'), { target: { value: 'clown' } });
        
        const generateButton = screen.getByText('Generate Story');
        fireEvent.click(generateButton);
        
        await waitFor(() => {
            expect(screen.getByText('Your Story:')).toBeInTheDocument();
            expect(screen.getByText('Once upon a time, there was a funny clown...')).toBeInTheDocument();
        });
    });

    test('handles API errors gracefully', async () => {
        fetch.mockResolvedValueOnce({
            json: async () => ({ error: 'API error occurred' })
        });

        const user = { subscription: 'full', role: 'user' };
        render(<StoryGenerator user={user} />);
        
        // Fill out form
        fireEvent.change(screen.getByTitle('adjective'), { target: { value: 'funny' } });
        fireEvent.change(screen.getByTitle('wordCount'), { target: { value: '200' } });
        fireEvent.change(screen.getByTitle('subject'), { target: { value: 'clown' } });
        
        const generateButton = screen.getByText('Generate Story');
        fireEvent.click(generateButton);
        
        await waitFor(() => {
            expect(screen.getByText('API error occurred')).toBeInTheDocument();
        });
    });
});