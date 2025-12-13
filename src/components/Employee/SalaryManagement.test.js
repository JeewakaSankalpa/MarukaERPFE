import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SalaryManagement from './SalaryManagement';
import api from '../../api/api';
import { toast } from 'react-toastify';

jest.mock('../../api/api');
jest.mock('react-toastify');

describe('SalaryManagement Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        api.get.mockResolvedValue({ data: [] }); // Default for all gets
    });

    test('renders salary management page', () => {
        render(<SalaryManagement />);
        expect(screen.getByText(/Salary & Payroll Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Monthly Processing/i)).toBeInTheDocument();
    });

    test('calls generate endpoint on button click', async () => {
        api.post.mockResolvedValue({ data: "Generated salaries for 5 employees" });

        render(<SalaryManagement />);

        const genBtn = screen.getByText(/Generate \/ Refresh Salaries/i);
        fireEvent.click(genBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/salary/generate'));
            expect(toast.success).toHaveBeenCalledWith("Generated salaries for 5 employees");
        });
    });
});
