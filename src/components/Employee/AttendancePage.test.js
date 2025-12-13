import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendancePage from './AttendancePage';
import api from '../../api/api';
import { toast } from 'react-toastify';

jest.mock('../../api/api');
jest.mock('react-toastify');

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(() => 'testuser'),
    },
    writable: true
});

describe('AttendancePage', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url === '/employee/all') return Promise.resolve({ data: [{ id: 'E1', username: 'testuser', firstName: 'John' }] });
            if (url.includes('/attendance')) return Promise.resolve({ data: [] }); // No logs initially
            return Promise.resolve({ data: [] });
        });
    });

    test('renders status and check-in button', async () => {
        render(<AttendancePage />);
        await waitFor(() => expect(screen.getByText(/Hello, John/i)).toBeInTheDocument());

        expect(screen.getByText(/Current Status:/i)).toBeInTheDocument();
        // Should show Check In button enabled
        expect(screen.getByText('Check In')).toBeEnabled();
    });

    test('calls check-in api', async () => {
        render(<AttendancePage />);
        await waitFor(() => expect(screen.getByText(/Hello, John/i)).toBeInTheDocument());

        api.post.mockResolvedValue({});
        fireEvent.click(screen.getByText('Check In'));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/attendance/checkin'));
            expect(toast.success).toHaveBeenCalled();
        });
    });
});
