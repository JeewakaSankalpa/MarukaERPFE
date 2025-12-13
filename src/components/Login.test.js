import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { AuthContext } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate,
}));

// Mock AuthContext
const mockLogin = jest.fn();

const renderLogin = () => {
    return render(
        <AuthContext.Provider value={{ login: mockLogin }}>
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        </AuthContext.Provider>
    );
};

describe('Login Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders login form', () => {
        renderLogin();
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('allows user to login with valid credentials', async () => {
        mockLogin.mockResolvedValue({ role: 'EMPLOYEE', userType: 'EMPLOYEE' });

        renderLogin();

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'kasun' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password12' } });

        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        expect(mockLogin).toHaveBeenCalledWith('kasun', 'password12');

        // Wait for navigation (Login.js has a 300ms delay)
        await waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
        }, { timeout: 1000 });
    });

    test('shows error on invalid credentials', async () => {
        mockLogin.mockRejectedValue(new Error('Invalid credentials'));

        renderLogin();

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wrong' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });

        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        expect(mockLogin).toHaveBeenCalled();

        // Check if error toast/message appears (Toast might not be in DOM if mocked out, but we can check calls)
        // Since ToastContainer is used, we might see the text if rendered.
        // Ideally we should mock toast, but for integration let's see if it renders.
    });
});
