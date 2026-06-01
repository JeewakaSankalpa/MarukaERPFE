import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useMemo, useState, useEffect } from 'react';
import { Container, Button, Modal, Form, Badge, Row, Col, Card, Alert, ButtonGroup } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';
import OverdraftConfirmModal from '../ReusableComponents/OverdraftConfirmModal';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import SafeSelect from '../ReusableComponents/SafeSelect';

const emptyLoanForm = () => ({
    loanDirection: 'COMPANY_BORROWED',
    interestMethod: 'SIMPLE_INTEREST',
    counterpartyType: 'BANK',
    counterpartyId: '',
    counterpartyName: '',
    bankName: '',
    loanReference: '',
    principalAmount: '',
    interestRate: '',
    durationMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    monthlyInstallment: '',
    paymentAccountId: '',
    paymentAccountName: '',
    paymentAccountType: '',
    paymentMethod: ''
});

const emptyRepaymentForm = () => ({
    amount: '',
    principalComponent: '',
    interestComponent: '0',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    paymentAccountId: '',
    paymentAccountName: '',
    paymentAccountType: '',
    paymentMethod: ''
});

const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-LK', { style: 'currency', currency: 'LKR' });

const methodLabel = {
    NO_INTEREST: 'No interest',
    SIMPLE_INTEREST: 'Simple interest',
    COMPOUND_INTEREST: 'Compound interest',
    REDUCING_BALANCE: 'Reducing balance'
};

export default function LoanManagement() {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [showAdd, setShowAdd] = useState(false);
    const [showRepay, setShowRepay] = useState(false);
    const [newLoan, setNewLoan] = useState(emptyLoanForm());
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [repayment, setRepayment] = useState(emptyRepaymentForm());
    const [showOverdraftModal, setShowOverdraftModal] = useState(false);
    const [accountBalance, setAccountBalance] = useState(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (repayment.paymentAccountId) {
            api.get(`/finance/accounts/${repayment.paymentAccountId}`)
                .then(res => setAccountBalance(Number(res.data.balance) || 0))
                .catch(() => setAccountBalance(null));
        } else {
            setAccountBalance(null);
        }
    }, [repayment.paymentAccountId]);

    const filteredLoans = useMemo(() => (
        filter === 'ALL' ? loans : loans.filter(loan => (loan.loanDirection || 'COMPANY_BORROWED') === filter)
    ), [loans, filter]);

    const summary = useMemo(() => loans.reduce((acc, loan) => {
        const direction = loan.loanDirection || 'COMPANY_BORROWED';
        const outstanding = Number(loan.outstandingBalance || 0);
        if (direction === 'EMPLOYEE_LOAN') acc.employeeReceivable += outstanding;
        else acc.companyPayable += outstanding;
        return acc;
    }, { companyPayable: 0, employeeReceivable: 0 }), [loans]);

    const selectedLoanIsEmployee = selectedLoan?.loanDirection === 'EMPLOYEE_LOAN';
    const loanFormIsEmployee = newLoan.loanDirection === 'EMPLOYEE_LOAN';

    const loadData = async () => {
        try {
            const [loanRes, employeeRes] = await Promise.all([
                api.get('/finance/loans'),
                api.get('/employee/all').catch(() => ({ data: [] }))
            ]);
            setLoans(loanRes.data || []);
            setEmployees(employeeRes.data || []);
        } catch (e) {
            toast.error('Failed to load loans');
        }
    };

    const employeeName = (employee) => {
        const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        return name || employee.username || employee.email || employee.id;
    };

    const handleLoanDirectionChange = (direction) => {
        setNewLoan({
            ...newLoan,
            loanDirection: direction,
            counterpartyType: direction === 'EMPLOYEE_LOAN' ? 'EMPLOYEE' : 'BANK',
            counterpartyId: '',
            counterpartyName: '',
            bankName: ''
        });
    };

    const handleEmployeeChange = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        const name = employee ? employeeName(employee) : '';
        setNewLoan({
            ...newLoan,
            counterpartyId: employeeId,
            counterpartyName: name,
            bankName: name
        });
    };

    const calculatePreview = () => {
        const principal = Number(newLoan.principalAmount || 0);
        const rate = Number(newLoan.interestRate || 0) / 100;
        const months = Math.max(Number(newLoan.durationMonths || 1), 1);
        if (!principal) return { totalInterest: 0, monthly: 0, totalPayable: 0 };
        let totalPayable = principal;
        if (newLoan.interestMethod === 'SIMPLE_INTEREST') {
            totalPayable = principal + (principal * rate * months / 12);
        } else if (newLoan.interestMethod === 'COMPOUND_INTEREST') {
            totalPayable = principal * Math.pow(1 + (rate / 12), months);
        } else if (newLoan.interestMethod === 'REDUCING_BALANCE' && rate > 0) {
            const monthlyRate = rate / 12;
            const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
            totalPayable = emi * months;
        }
        return {
            totalInterest: Math.max(totalPayable - principal, 0),
            monthly: totalPayable / months,
            totalPayable
        };
    };

    const handleCreate = async () => {
        if (!newLoan.principalAmount || Number(newLoan.principalAmount) <= 0) {
            toast.warn('Please enter a valid loan amount');
            return;
        }
        if (!newLoan.counterpartyName) {
            toast.warn(loanFormIsEmployee ? 'Please select an employee' : 'Please enter the bank or lender');
            return;
        }
        if (!newLoan.paymentAccountId || !newLoan.paymentMethod) {
            toast.warn('Please select the cash/bank account and payment method');
            return;
        }

        try {
            await api.post('/finance/loans', newLoan);
            toast.success(loanFormIsEmployee ? 'Employee loan created' : 'Company loan created');
            setShowAdd(false);
            setNewLoan(emptyLoanForm());
            loadData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to add loan');
        }
    };

    const openRepayment = (loan) => {
        setSelectedLoan(loan);
        setRepayment(emptyRepaymentForm());
        setShowRepay(true);
    };

    const handleRepay = async () => {
        if (!selectedLoan) return;
        if (!repayment.paymentAccountId || !repayment.paymentMethod) {
            toast.warn('Please select the cash/bank account and payment method');
            return;
        }

        const amount = Number(repayment.amount || 0);
        const principal = repayment.principalComponent === '' ? amount : Number(repayment.principalComponent || 0);
        const interest = Number(repayment.interestComponent || 0);
        const maxPrincipal = Number(selectedLoan.outstandingBalance || 0);

        if (amount <= 0) {
            toast.warn('Please enter a valid amount');
            return;
        }
        if (principal < 0 || interest < 0 || Math.abs((principal + interest) - amount) > 0.01) {
            toast.warn('Principal plus interest must equal the total amount');
            return;
        }
        if (principal > maxPrincipal) {
            toast.error(`Principal cannot exceed outstanding balance: Rs. ${maxPrincipal.toFixed(2)}`);
            return;
        }

        if (!selectedLoanIsEmployee && accountBalance !== null && amount > accountBalance) {
            setShowOverdraftModal(true);
            return;
        }
        await submitRepay(false);
    };

    const submitRepay = async (allowOverdraft = false) => {
        try {
            const amount = Number(repayment.amount || 0);
            const payload = {
                ...repayment,
                principalComponent: repayment.principalComponent === '' ? amount : repayment.principalComponent,
                interestComponent: repayment.interestComponent || '0',
                allowOverdraft
            };
            await api.post(`/finance/loans/${selectedLoan.id}/repay`, payload);
            toast.success(selectedLoanIsEmployee ? 'Collection recorded' : 'Repayment recorded');
            setShowRepay(false);
            loadData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to record loan payment');
        }
    };

    const preview = calculatePreview();

    return (
        <>
            <Container className="py-4">
                <div className="d-flex justify-content-between align-items-start mb-4">
                    <div className="d-flex align-items-center">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <div>
                            <h2 className="mb-1">Loan Management</h2>
                            <div className="text-muted small">Company borrowings and employee loans are tracked separately.</div>
                        </div>
                    </div>
                    <Button onClick={() => setShowAdd(true)}>+ Add New Loan</Button>
                </div>

                <Row className="g-3 mb-3">
                    <Col md={6}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body>
                                <div className="text-muted small text-uppercase">Company Loans Payable</div>
                                <h4 className="mb-0">{formatMoney(summary.companyPayable)}</h4>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={6}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body>
                                <div className="text-muted small text-uppercase">Employee Loans Receivable</div>
                                <h4 className="mb-0">{formatMoney(summary.employeeReceivable)}</h4>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <ButtonGroup className="mb-4">
                    <Button variant={filter === 'ALL' ? 'primary' : 'outline-primary'} onClick={() => setFilter('ALL')}>All</Button>
                    <Button variant={filter === 'COMPANY_BORROWED' ? 'primary' : 'outline-primary'} onClick={() => setFilter('COMPANY_BORROWED')}>Company Borrowed</Button>
                    <Button variant={filter === 'EMPLOYEE_LOAN' ? 'primary' : 'outline-primary'} onClick={() => setFilter('EMPLOYEE_LOAN')}>Employee Loans</Button>
                </ButtonGroup>

                <Row>
                    {filteredLoans.map(loan => {
                        const isEmployeeLoan = loan.loanDirection === 'EMPLOYEE_LOAN';
                        const counterparty = loan.counterpartyName || loan.bankName || 'Unknown';
                        return (
                            <Col md={6} lg={4} key={loan.id} className="mb-4">
                                <Card className="shadow-sm border-0 h-100">
                                    <Card.Header className="bg-white d-flex justify-content-between align-items-start gap-2">
                                        <div>
                                            <strong>{counterparty}</strong>
                                            <div className="small text-muted">{isEmployeeLoan ? 'Employee loan' : 'Company borrowing'}</div>
                                        </div>
                                        <Badge bg={loan.status === 'CLOSED' ? 'success' : 'primary'}>{loan.status}</Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="mb-2 text-muted small">Ref: {loan.loanReference || '-'}</div>
                                        <h4 className={isEmployeeLoan ? 'text-success' : 'text-primary'}>{formatMoney(loan.outstandingBalance)}</h4>
                                        <div className="small text-muted mb-3">{isEmployeeLoan ? 'Receivable Balance' : 'Outstanding Balance'}</div>

                                        <Row className="g-2 small mb-3">
                                            <Col xs={6}>Principal: {formatMoney(loan.principalAmount)}</Col>
                                            <Col xs={6}>Paid: {formatMoney(loan.totalRepaid)}</Col>
                                            <Col xs={6}>Interest paid: {formatMoney(loan.totalInterestPaid)}</Col>
                                            <Col xs={6}>Rate: {Number(loan.interestRate || 0)}%</Col>
                                            <Col xs={6}>Method: {methodLabel[loan.interestMethod] || 'Simple interest'}</Col>
                                            <Col xs={6}>Term: {loan.durationMonths}m</Col>
                                        </Row>

                                        <Button size="sm" variant={isEmployeeLoan ? 'outline-primary' : 'outline-success'} className="w-100"
                                            disabled={loan.status === 'CLOSED'}
                                            onClick={() => openRepayment(loan)}>
                                            {isEmployeeLoan ? 'Record Collection' : 'Record Repayment'}
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>

                {filteredLoans.length === 0 && (
                    <Alert variant="light" className="border">No loans found for this filter.</Alert>
                )}

                <Modal show={showAdd} onHide={() => setShowAdd(false)} size="lg">
                    <Modal.Header closeButton><Modal.Title>Add New Loan</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Loan Type</Form.Label>
                                <SafeSelect value={newLoan.loanDirection} onChange={e => handleLoanDirectionChange(e.target.value)}>
                                    <option value="COMPANY_BORROWED">Company borrowed money</option>
                                    <option value="EMPLOYEE_LOAN">Company gave employee a loan</option>
                                </SafeSelect>
                            </Form.Group>

                            {loanFormIsEmployee ? (
                                <Form.Group className="mb-3">
                                    <Form.Label>Employee</Form.Label>
                                    <SafeSelect value={newLoan.counterpartyId} onChange={e => handleEmployeeChange(e.target.value)} isSearchable>
                                        <option value="">Select employee</option>
                                        {employees.map(employee => (
                                            <option key={employee.id} value={employee.id}>{employeeName(employee)}</option>
                                        ))}
                                    </SafeSelect>
                                </Form.Group>
                            ) : (
                                <Form.Group className="mb-3">
                                    <Form.Label>Bank / Lender Name</Form.Label>
                                    <Form.Control
                                        value={newLoan.counterpartyName}
                                        onChange={e => setNewLoan({ ...newLoan, counterpartyName: e.target.value, bankName: e.target.value })}
                                    />
                                </Form.Group>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label>Loan Reference No.</Form.Label>
                                <Form.Control value={newLoan.loanReference} onChange={e => setNewLoan({ ...newLoan, loanReference: e.target.value })} />
                            </Form.Group>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Principal Amount</Form.Label>
                                        <Form.Control type="number" min="0" value={newLoan.principalAmount} onChange={e => setNewLoan({ ...newLoan, principalAmount: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Annual Interest Rate (%)</Form.Label>
                                        <Form.Control type="number" min="0" value={newLoan.interestRate} onChange={e => setNewLoan({ ...newLoan, interestRate: e.target.value })} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Interest Method</Form.Label>
                                        <SafeSelect value={newLoan.interestMethod} onChange={e => setNewLoan({ ...newLoan, interestMethod: e.target.value })}>
                                            <option value="NO_INTEREST">No interest</option>
                                            <option value="SIMPLE_INTEREST">Simple interest</option>
                                            <option value="COMPOUND_INTEREST">Compound interest</option>
                                            <option value="REDUCING_BALANCE">Reducing balance</option>
                                        </SafeSelect>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Start Date</Form.Label>
                                        <SafeDatePicker name="startDate" value={newLoan.startDate} onChange={e => setNewLoan({ ...newLoan, startDate: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Duration (Months)</Form.Label>
                                        <Form.Control type="number" min="1" value={newLoan.durationMonths} onChange={e => setNewLoan({ ...newLoan, durationMonths: e.target.value })} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Alert variant="info" className="small">
                                Estimated monthly installment: <strong>{formatMoney(preview.monthly)}</strong> | Projected interest: <strong>{formatMoney(preview.totalInterest)}</strong>
                            </Alert>

                            <div className="mb-2">
                                <PaymentAccountPicker
                                    required
                                    value={newLoan.paymentAccountId}
                                    onChange={info => setNewLoan({ ...newLoan, ...info })}
                                />
                                <small className="text-muted d-block mt-1">
                                    {loanFormIsEmployee ? 'This is the account money is paid out from.' : 'This is the account loan money is received into.'}
                                </small>
                            </div>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleCreate}>Create Loan Account</Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showRepay} onHide={() => setShowRepay(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {selectedLoanIsEmployee ? 'Record Collection' : 'Record Repayment'} - {selectedLoan?.counterpartyName || selectedLoan?.bankName}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <div className="mb-3">
                                <PaymentAccountPicker
                                    required
                                    value={repayment.paymentAccountId}
                                    onChange={info => setRepayment({ ...repayment, ...info })}
                                />
                            </div>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Total Amount</Form.Label>
                                        <Form.Control type="number" min="0" value={repayment.amount} onChange={e => setRepayment({ ...repayment, amount: e.target.value, principalComponent: repayment.principalComponent || e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Principal Component</Form.Label>
                                        <Form.Control type="number" min="0" max={selectedLoan?.outstandingBalance} value={repayment.principalComponent} onChange={e => setRepayment({ ...repayment, principalComponent: e.target.value })} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Interest Component</Form.Label>
                                        <Form.Control type="number" min="0" value={repayment.interestComponent} onChange={e => setRepayment({ ...repayment, interestComponent: e.target.value })} />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <div className="small text-muted mb-3">
                                Principal reduces the outstanding balance. Interest is posted separately.
                                Current principal balance: {formatMoney(selectedLoan?.outstandingBalance)}
                            </div>
                            {!selectedLoanIsEmployee && accountBalance !== null && (
                                <small className={`mb-3 d-block ${accountBalance < Number(repayment.amount || 0) ? 'text-danger fw-bold' : 'text-muted'}`}>
                                    Account balance: Rs. {accountBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                    {accountBalance < Number(repayment.amount || 0) && ' - Insufficient, overdraft will apply'}
                                </small>
                            )}
                            <Form.Group className="mb-3">
                                <Form.Label>{selectedLoanIsEmployee ? 'Collection Date' : 'Date Paid'}</Form.Label>
                                <SafeDatePicker name="date" value={repayment.date} onChange={e => setRepayment({ ...repayment, date: e.target.value })} />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>Reference / Confirmation</Form.Label>
                                <Form.Control value={repayment.reference} onChange={e => setRepayment({ ...repayment, reference: e.target.value })} />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRepay(false)}>Cancel</Button>
                        <Button variant="success" onClick={handleRepay}>{selectedLoanIsEmployee ? 'Save Collection' : 'Save Repayment'}</Button>
                    </Modal.Footer>
                </Modal>
            </Container>

            <OverdraftConfirmModal
                show={showOverdraftModal}
                amount={repayment.amount}
                balance={accountBalance}
                accountName={repayment.paymentAccountName}
                onConfirm={() => { setShowOverdraftModal(false); submitRepay(true); }}
                onCancel={() => setShowOverdraftModal(false)}
            />
        </>
    );
}
