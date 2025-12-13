import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeaveRequestPage from './LeaveRequestPage';
import api from '../../api/api';
import { toast } from 'react-toastify';

jest.mock('../../api/api');
jest.mock('react-toastify');

// Mock localStorage
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: function (key) { return store[key] || null; },
        setItem: function (key, value) { store[key] = value.toString(); },
        clear: function () { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LeaveRequestPage', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url === '/employee/all') return Promise.resolve({ data: [{ id: 'E1', username: 'testuser' }] });
            if (url.includes('/leave/E1')) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
        localStorage.setItem('username', 'testuser');
    });

    test('opens apply modal and submits', async () => {
        render(<LeaveRequestPage />);

        // Open Modal
        fireEvent.click(screen.getByText(/\+ Apply Leave/i));
        expect(screen.getByText(/Apply for Leave/i)).toBeInTheDocument();

        // Submit
        api.post.mockResolvedValue({});
        fireEvent.click(screen.getByText(/Submit Request/i));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/leave/apply', expect.objectContaining({ employeeId: 'E1' }));
            expect(toast.success).toHaveBeenCalled();
        });
    });
});
