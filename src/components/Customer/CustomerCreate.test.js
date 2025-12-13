import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomerCreate from './CustomerCreate';
import { BrowserRouter } from 'react-router-dom';
import api from '../../api/api';

// Mock API
jest.mock('../../api/api');

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate,
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
    ToastContainer: () => null,
}));

const renderComponent = () => {
    return render(
        <BrowserRouter>
            <CustomerCreate />
        </BrowserRouter>
    );
};

describe('CustomerCreate Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders customer creation form', () => {
        renderComponent();
        expect(screen.getByText(/Add Customer/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
        // Use getAllByLabelText because "Email" appears multiple times (Company Email, Contact Person Email)
        expect(screen.getAllByLabelText(/Email/i).length).toBeGreaterThan(0);
    });

    test('submits form with files successfully', async () => {
        api.post.mockResolvedValue({ data: { id: 'c1' } });

        renderComponent();

        // Fill basic fields
        fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Test Corp' } });
        fireEvent.change(screen.getByLabelText(/Company Address/i), { target: { value: '123 Test St' } });

        // Select Company Email specifically (assuming it's the first one or using a more specific selector if possible, but getAll is safer)
        const emailInputs = screen.getAllByLabelText(/Email/i);
        fireEvent.change(emailInputs[0], { target: { value: 'test@example.com' } }); // Company Email

        fireEvent.change(screen.getByLabelText(/Company Contact Number/i), { target: { value: '0771234567' } }); // Must start with 0 and be 10 digits
        fireEvent.change(screen.getByLabelText(/Company Business Register Number/i), { target: { value: 'BR12345' } });

        // Currency
        fireEvent.change(screen.getByLabelText(/Currency/i), { target: { value: 'VAT' } }); // 'VAT' maps to Rupees in the component options

        fireEvent.change(screen.getByLabelText(/Credit Period/i), { target: { value: '30' } });

        // Contact Person Data
        fireEvent.change(screen.getByLabelText(/Contact Person Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Contact Person Mobile Number/i), { target: { value: '0777654321' } });
        fireEvent.change(emailInputs[1], { target: { value: 'john@example.com' } }); // Contact Person Email

        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

        // VAT Type
        fireEvent.change(screen.getByLabelText(/VAT Type/i), { target: { value: 'VAT' } });
        // VAT Number (appears after VAT Type is selected)
        const vatNumberInput = await screen.findByPlaceholderText(/Enter your VAT number/i);
        fireEvent.change(vatNumberInput, { target: { value: 'VAT123' } });

        // Upload files
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        const vatInput = screen.getByLabelText(/VAT Registration Document/i);
        const brInput = screen.getByLabelText(/Business Registration Document/i);

        fireEvent.change(vatInput, { target: { files: [file] } });
        fireEvent.change(brInput, { target: { files: [file] } });

        // Submit
        fireEvent.click(screen.getByText(/Save/i));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/customer/add', expect.any(FormData), expect.any(Object));
            // Verify FormData contains files
            const formData = api.post.mock.calls[0][1];
            expect(formData.get('vatDocument')).toBe(file);
            expect(formData.get('businessRegDocument')).toBe(file);
        });

        // Advance timers to trigger navigation
        jest.advanceTimersByTime(1500);

        await waitFor(() => {
            expect(mockedNavigate).toHaveBeenCalledWith('/customer/search');
        });
    });
});
