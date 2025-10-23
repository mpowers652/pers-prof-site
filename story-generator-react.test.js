/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoryGenerator from './components/StoryGenerator.jsx';

// Mock fetch
global.fetch = jest.fn();

describe('StoryGenerator React Component', () => {
    beforeEach(() => {
        fetch.mockClear();
        delete window.currentUser;
    });

    test('should show loading state initially when no user provided', () => {
        render(<StoryGenerator />);
        expect(screen.getByText('Checking access...')).toBeInTheDocument();
    });

    test('should show login prompt when user is not authenticated', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401
        });

        render(<StoryGenerator />);
        
        await waitFor(() => {
            expect(screen.getByText('Please log in to access the Story Generator.')).toBeInTheDocument();
            expect(screen.getByText('Log In')).toBeInTheDocument();
        });
    });

    test('should show upgrade prompt when user has basic subscription', async () => {
        const basicUser = {
            id: 1,
            username: 'testuser',
            subscription: 'basic',
            role: 'user'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: basicUser })
        });

        render(<StoryGenerator />);
        
        await waitFor(() => {
            expect(screen.getByText('This feature requires a full subscription.')).toBeInTheDocument();
            expect(screen.getByText('Current subscription: basic')).toBeInTheDocument();
            expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
        });
    });

    test('should show story generator when user has full access', async () => {
        const adminUser = {
            id: 1,
            username: 'admin',
            subscription: 'full',
            role: 'admin'
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: adminUser })
        });

        render(<StoryGenerator />);
        
        await waitFor(() => {
            expect(screen.getByText('📚 Story Generator')).toBeInTheDocument();
            expect(screen.getByText('Select adjective...')).toBeInTheDocument();
            expect(screen.getByText('Generate Story')).toBeInTheDocument();
        });
    });

    test('should use provided user prop without API call', () => {
        const adminUser = {
            id: 1,
            username: 'admin',
            subscription: 'full',
            role: 'admin'
        };

        render(<StoryGenerator user={adminUser} />);
        
        expect(screen.getByText('📚 Story Generator')).toBeInTheDocument();
        expect(screen.getByText('Generate Story')).toBeInTheDocument();
        expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle story generation', async () => {
        const adminUser = {
            id: 1,
            username: 'admin',
            subscription: 'full',
            role: 'admin'
        };

        // Mock successful story generation
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ story: 'Once upon a time, there was a funny story about puppies.' })
        });

        render(<StoryGenerator user={adminUser} />);
        
        // Fill in the form
        fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'funny' } });
        
        // Find and click generate button
        const generateButton = screen.getByText('Generate Story');
        fireEvent.click(generateButton);
        
        await waitFor(() => {
            expect(screen.getByText('Your Story:')).toBeInTheDocument();
            expect(screen.getByText('Once upon a time, there was a funny story about puppies.')).toBeInTheDocument();
        });
    });

    test('should listen for auth updates', async () => {
        render(<StoryGenerator />);
        
        // Initially should show loading
        expect(screen.getByText('Checking access...')).toBeInTheDocument();
        
        // Simulate auth update event
        const adminUser = {
            id: 1,
            username: 'admin',
            subscription: 'full',
            role: 'admin'
        };
        
        window.currentUser = adminUser;
        window.dispatchEvent(new CustomEvent('auth:updated', { detail: { user: adminUser } }));
        
        await waitFor(() => {
            expect(screen.getByText('📚 Story Generator')).toBeInTheDocument();
        });
    });
});