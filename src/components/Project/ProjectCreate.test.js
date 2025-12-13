import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectForm from './ProjectCreate';
import { BrowserRouter } from 'react-router-dom';
import api from '../../api/api';

// Mock API
jest.mock('../../api/api');

// Mock useNavigate and useParams
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate,
    useParams: () => ({}),
}));

const renderComponent = () => {
    return render(
        <BrowserRouter>
            <ProjectForm />
        </BrowserRouter>
    );
};

describe('ProjectCreate Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock dropdown data
        api.get.mockImplementation((url) => {
            if (url === '/customer/all') {
                return Promise.resolve({ data: [{ id: 'c1', name: 'Customer A' }] });
            }
            if (url === '/employee/all') {
                return Promise.resolve({ data: [{ id: 'e1', firstName: 'John', lastName: 'Doe' }] });
            }
            return Promise.resolve({ data: {} });
        });
    });

    test('renders project creation form', async () => {
        renderComponent();

        expect(screen.getByText(/Create New Project/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();

        // Wait for dropdowns to load
        await waitFor(() => {
            expect(screen.getByText(/Customer A/i)).toBeInTheDocument();
        });
    });

    test('submits form successfully', async () => {
        api.post.mockResolvedValue({ data: { id: 'p1' } });
        jest.useFakeTimers();

        renderComponent();

        // Wait for dropdowns to populate
        await waitFor(() => expect(screen.getByText('Customer A')).toBeInTheDocument());

        // Fill form
        fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: 'New Project' } });
        fireEvent.change(screen.getByLabelText(/Comment/i), { target: { value: 'Test Comment' } });

        // Select Customer
        fireEvent.change(screen.getByLabelText(/Customer/i), { target: { value: 'c1' } });

        // Select Sales Rep
        fireEvent.change(screen.getByLabelText(/Sales Representative/i), { target: { value: 'e1' } });

        // Submit
        fireEvent.click(screen.getByText(/Save Project/i));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/projects/create', expect.any(FormData), expect.any(Object));
        });

        // Fast-forward time for navigation
        jest.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith('/projects/manage/p1');
        });

        jest.useRealTimers();
    });
});
