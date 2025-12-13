import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmployeeCreate from './EmployeeCreate';
import api from '../../api/api';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('../../api/api');
jest.mock('react-toastify');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: undefined }),
}));

describe('EmployeeCreate Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/departments') return Promise.resolve({ data: { content: [] } });
            if (url === '/employee/all') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: {} });
        });
    });

    test('renders create employee form correctly', async () => {
        render(
            <BrowserRouter>
                <EmployeeCreate mode="create" />
            </BrowserRouter>
        );

        expect(screen.getByText(/Add New Employee/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    test('submits form successfully', async () => {
        api.post.mockResolvedValue({ data: 'Success' });

        render(
            <BrowserRouter>
                <EmployeeCreate mode="create" />
            </BrowserRouter>
        );

        // Fill Form
        fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
        fireEvent.change(screen.getByLabelText(/Contact Number/i), { target: { value: '0771234567' } });
        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johndoe' } });
        fireEvent.change(screen.getByPlaceholderText(/Enter or Generate/i), { target: { value: 'password123' } });

        // Submit
        const saveBtn = screen.getByText(/Save Employee/i);
        fireEvent.click(saveBtn);

        await waitFor(() => {
            // Expect 2 POST calls (Auth + Employee)
            expect(api.post).toHaveBeenCalledTimes(2);
            expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ username: 'johndoe' }));
            expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/employee/register'), expect.objectContaining({ firstName: 'John' }));
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('created'));
        });
    });
});
