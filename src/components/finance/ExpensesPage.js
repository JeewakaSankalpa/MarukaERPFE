import { ArrowLeft, Plus, Search } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Button, Table, Modal, Form, Row, Col, Card, Badge, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, Tooltip, CartesianGrid, XAxis, YAxis,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import ResponsiveContainer from "../ReusableComponents/SafeResponsiveContainer";
import api from '../../api/api';
import GRNPaymentModal from '../GRN/GRNPaymentModal';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';
import OverdraftConfirmModal from '../ReusableComponents/OverdraftConfirmModal';
import SafeSelect from '../ReusableComponents/SafeSelect';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import './ExpensesPage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666'];

const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
const isOpeningStockGRN = (grn) => grn?.supplierNameSnapshot?.toLowerCase() === 'opening stock import';

export default function ExpensesPage() {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedGRN, setSelectedGRN] = useState(null);

    // Outflow breakdown raw data
    const [grns, setGrns] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loans, setLoans] = useState([]);

    // Filters
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '', category: 'OPERATIONAL', amount: '',
        expenseDate: new Date().toISOString().substring(0, 10),
        description: '', paymentMethod: 'CASH', reference: '', status: 'PAID'
    });

    const [paymentAccounts, setPaymentAccounts] = useState([]);
    const [subAccounts, setSubAccounts] = useState([]);
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState(null);

    const [showOverdraftModal, setShowOverdraftModal] = useState(false);
    const [accountBalance, setAccountBalance] = useState(null);

    useEffect(() => { loadExpenses(); loadBreakdownData(); loadPaymentAccounts(); }, []);

    const loadPaymentAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts/payment-accounts');
            // Only show parent-level payment accounts (not sub-accounts themselves in top list)
            setPaymentAccounts(res.data || []);
        } catch { /* silent */ }
    };

    const handlePaymentAccountChange = async (accountId) => {
        const acc = paymentAccounts.find(a => a.id === accountId);
        setSelectedPaymentAccount(acc || null);
        setSubAccounts([]);
        setFormData(f => ({
            ...f,
            paymentAccountId: accountId,
            paymentAccountType: acc?.paymentAccountType || 'OTHER',
            paymentMethod: acc?.paymentAccountType === 'CREDIT_CARD' ? 'CARD'
                         : acc?.paymentAccountType === 'CASH' ? 'CASH'
                         : acc?.paymentAccountType === 'BANK' ? 'BANK_TRANSFER'
                         : 'OTHER'
        }));
        if (acc?.hasSubAccounts) {
            try {
                const res = await api.get(`/finance/accounts/${accountId}/subaccounts`);
                setSubAccounts(res.data || []);
            } catch { /* silent */ }
        }
    };

    const handleSubAccountChange = (subAccountId) => {
        const sub = subAccounts.find(a => a.id === subAccountId);
        setFormData(f => ({
            ...f,
            paymentAccountId: subAccountId,
            paymentAccountName: sub?.name || '',
        }));
    };

    const loadExpenses = async () => {
        try {
            const res = await api.get('/finance/expenses');
            setExpenses(res.data || []);
        } catch { toast.error("Failed to load expenses"); }
    };

    const loadBreakdownData = async () => {
        const [grnRes, assetRes, loanRes] = await Promise.allSettled([
            api.get('/grns?size=1000'),
            api.get('/assets'),
            api.get('/finance/loans'),
        ]);
        setGrns(grnRes.status === 'fulfilled' ? (grnRes.value.data?.content || grnRes.value.data || []) : []);
        setAssets(assetRes.status === 'fulfilled' ? (assetRes.value.data || []) : []);
        setLoans(loanRes.status === 'fulfilled' ? (loanRes.value.data || []) : []);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.amount) { toast.warn("Title and Amount are required"); return; }
        if (!formData.paymentAccountId) { toast.warn("Please select a payment account"); return; }
        if (!formData.paymentMethod) { toast.warn("Please explicitly select a Payment Method (e.g. Card, Cash)"); return; }

        // Check account balance for overdraft
        if (accountBalance !== null && Number(formData.amount) > accountBalance) {
            setShowOverdraftModal(true);
            return;
        }
        await submitExpense(false);
    };

    const submitExpense = async (allowOverdraft = false) => {
        try {
            await api.post('/finance/expenses', { ...formData, allowOverdraft });
            toast.success("Expense saved");
            setShowModal(false);
            setFormData({ title: '', category: 'OPERATIONAL', amount: '', expenseDate: new Date().toISOString().substring(0, 10), description: '', paymentMethod: 'CASH', reference: '', status: 'PAID' });
            setAccountBalance(null);
            loadExpenses(); loadBreakdownData();
        } catch { toast.error("Failed to save expense"); }
    };

    const handleGRNClick = async (projectId) => {
        try { setSelectedGRN((await api.get(`/grns/${projectId}`)).data); }
        catch { toast.error("Failed to load GRN details"); }
    };

    // Filter Logic
    const filteredExpenses = expenses.filter(exp => {
        const matchCategory = filterCategory === 'ALL' || exp.category === filterCategory;
        const matchSearch = !searchTerm ||
            (exp.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (exp.description?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchMonth = !filterMonth || (exp.expenseDate?.substring(0, 7) === filterMonth);
        return matchCategory && matchSearch && matchMonth;
    });

    // Bar chart — monthly
    const monthlyData = {};
    filteredExpenses.forEach(exp => {
        const m = exp.expenseDate?.substring(0, 7) || 'Unknown';
        monthlyData[m] = (monthlyData[m] || 0) + (exp.amount || 0);
    });
    const barChartData = Object.keys(monthlyData).sort().map(m => ({ month: m, amount: monthlyData[m] }));

    // Pie chart — category
    const catDataMap = {};
    filteredExpenses.forEach(exp => {
        const c = exp.category || 'Unknown';
        catDataMap[c] = (catDataMap[c] || 0) + (exp.amount || 0);
    });
    const pieChartData = Object.keys(catDataMap).map(c => ({ name: c, value: catDataMap[c] }));
    const totalFiltered = filteredExpenses.reduce((a, e) => a + (e.amount || 0), 0);

    // Filtered Arrays based on Month for the Breakdown
    const filteredForBreakdown = useMemo(() => {
        const supplierGrns = grns.filter(g => !isOpeningStockGRN(g));
        if (!filterMonth) return { fGrns: supplierGrns, fAssets: assets, fLoans: loans, fExpenses: expenses };
        return {
            fGrns: supplierGrns.filter(g => g.createdAt?.substring(0, 7) === filterMonth || g.updatedAt?.substring(0, 7) === filterMonth),
            fAssets: assets.filter(a => a.purchaseDate?.substring(0, 7) === filterMonth || a.createdAt?.substring(0, 7) === filterMonth),
            fLoans: loans.filter(l => l.startDate?.substring(0, 7) === filterMonth),
            fExpenses: expenses.filter(e => e.expenseDate?.substring(0, 7) === filterMonth)
        };
    }, [grns, assets, loans, expenses, filterMonth]);

    // Outflow Breakdown
    const outflowBreakdown = useMemo(() => {
        const { fGrns, fAssets, fLoans, fExpenses } = filteredForBreakdown;

        // ── PAID (money that has actually left in this period) ──
        const isSupplierExpense = (expense) =>
            expense.category === 'SUPPLIER_PAYMENT' || expense.category === 'SUPPLIER_MIGRATION_PAYMENT';
        const migrationPaid = fExpenses
            .filter(e => e.category === 'SUPPLIER_MIGRATION_PAYMENT' && e.status === 'PAID')
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const migrationPayable = fExpenses
            .filter(e => e.category === 'SUPPLIER_MIGRATION_PAYMENT' && e.status !== 'PAID')
            .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const supplierPaid     = fGrns.reduce((s, g) => s + (Number(g.totalPaid) || 0), 0) + migrationPaid;
        const assetPaid        = fAssets.reduce((s, a) => s + (Number(a.paidAmount) || 0), 0);
        const loanPaid         = fLoans.reduce((s, l) => s + (Number(l.totalRepaid) || 0), 0);
        const sitePaid         = fExpenses.filter(e => !isSupplierExpense(e) && e.status === 'PAID').reduce((s, e) => s + (Number(e.amount) || 0), 0);

        // ── PAYABLE (owed but not yet paid from this period) ──
        const supplierPayable  = fGrns.filter(g => g.paymentStatus !== 'FULLY_PAID').reduce((s, g) => {
            const invoice = Number(g.invoiceAmount) || 0;
            const paid    = Number(g.totalPaid) || 0;
            return s + Math.max(0, invoice - paid);
        }, 0) + migrationPayable;
        const assetPayable     = fAssets.reduce((s, a) => {
            const total = Number(a.purchaseCost) || Number(a.cost) || 0;
            const paid  = Number(a.paidAmount) || 0;
            return s + Math.max(0, total - paid);
        }, 0);
        const loanPayable      = fLoans.filter(l => l.status === 'ACTIVE').reduce((s, l) => s + (Number(l.outstandingBalance) || 0), 0);
        const sitePayable      = fExpenses.filter(e => !isSupplierExpense(e) && e.status !== 'PAID').reduce((s, e) => s + (Number(e.amount) || 0), 0);

        const categories = [
            { name: 'Suppliers',     paid: supplierPaid,   payable: supplierPayable,   color: '#0088FE', icon: '🏭', sub: `${fGrns.length} GRNs + migration` },
            { name: 'Assets',        paid: assetPaid,      payable: assetPayable,      color: '#00C49F', icon: '🏗️', sub: `${fAssets.length} assets` },
            { name: 'Loans',         paid: loanPaid,       payable: loanPayable,       color: '#FFBB28', icon: '🏦', sub: `${fLoans.length} loans` },
            { name: 'Site Expenses', paid: sitePaid,       payable: sitePayable,       color: '#FF8042', icon: '🔧', sub: 'Operational & others' }
        ];

        // ── METHOD BREAKDOWN (Extracting explicit methods across all modules if available) ──
        let methodMap = {
            'CARD': { name: 'Credit Card', paid: 0, color: '#AF19FF', icon: '💳' },
            'BANK_TRANSFER': { name: 'Bank transfer', paid: 0, color: '#0088FE', icon: '🏦' },
            'CASH': { name: 'Cash', paid: 0, color: '#00C49F', icon: '💵' },
            'CHEQUE': { name: 'Cheque', paid: 0, color: '#FFBB28', icon: '🧾' }
        };

        const addMethod = (method, type, amt) => {
            if (!method && type === 'CREDIT_CARD') method = 'CARD';
            if (!method && type === 'CASH') method = 'CASH';
            if (!method) method = 'BANK_TRANSFER';

            if (methodMap[method]) {
                methodMap[method].paid += amt;
            } else {
                methodMap['BANK_TRANSFER'].paid += amt;
            }
        };

        // GRNs: expand individual payment records (each has its own paymentMethod)
        fGrns.forEach(g => {
            (g.paymentHistory || []).forEach(p => addMethod(p.paymentMethod, p.paymentAccountType, Number(p.amount) || 0));
        });

        // Direct expenses: each has its own paymentMethod
        fExpenses.filter(e => e.status === 'PAID').forEach(e => addMethod(e.paymentMethod, e.paymentAccountType, Number(e.amount) || 0));

        // Assets: each payment record has its own paymentMethod
        fAssets.forEach(a => {
            (a.paymentHistory || []).forEach(p => addMethod(p.paymentMethod, p.paymentAccountType, Number(p.amount) || 0));
            // Fallback if no payment history but paidAmount exists (older records)
            if (!a.paymentHistory?.length && a.paidAmount > 0) addMethod(a.paymentMethod, a.paymentAccountType, Number(a.paidAmount) || 0);
        });

        // Loans: expand individual repayment history records (each has its own paymentMethod)
        fLoans.forEach(l => {
            (l.repaymentHistory || []).forEach(r => addMethod(r.paymentMethod, r.paymentAccountType, Number(r.amount) || 0));
        });

        const methodCategories = Object.keys(methodMap)
            .map(k => ({ name: methodMap[k].name, paid: methodMap[k].paid, color: methodMap[k].color, icon: methodMap[k].icon }))
            .filter(m => m.paid > 0);

        const totalPaidOut    = categories.reduce((s, c) => s + c.paid, 0);
        const totalPayable    = categories.reduce((s, c) => s + c.payable, 0);
        const totalCommitted  = totalPaidOut + totalPayable;

        return { categories, methodCategories, totalPaidOut, totalPayable, totalCommitted };
    }, [filteredForBreakdown]);

    const { categories: outflowCategories, methodCategories, totalPaidOut, totalPayable, totalCommitted } = outflowBreakdown;

    const [activeTab, setActiveTab] = useState('category');

    const CustomPctLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.04) return null;
        const R = Math.PI / 180;
        const r = innerRadius + (outerRadius - innerRadius) * 0.5;
        return (
            <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
                fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <Container fluid className="expenses-page">
            {/* Page Header */}
            <div className="expenses-header">
                <div className="expenses-heading-group">
                    <button type="button" className="expenses-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={18} aria-hidden="true" /></button>
                    <div>
                        <span className="expenses-eyebrow">Sales &amp; Finance</span>
                        <h1>Expense management</h1>
                        <p>Review paid outflows, upcoming payables, and manual expense records.</p>
                    </div>
                </div>
                <Button variant="primary" className="expenses-primary-action" onClick={() => setShowModal(true)}><Plus size={18} aria-hidden="true" /> New expense</Button>
            </div>

            {/* Global Filter Bar */}
            <Card className="expenses-filter-panel">
                <Card.Body className="py-3">
                    <Row className="g-3 align-items-center">
                        <Col md={12} className="expenses-filter-heading">Filters <small>{filterMonth ? `Showing ${filterMonth}` : 'Showing all time'}</small></Col>
                        <Col md={3}>
                            <Form.Label htmlFor="expense-search">Search records</Form.Label>
                            <InputGroup className="expenses-search-control">
                                <InputGroup.Text><Search size={17} aria-hidden="true" /></InputGroup.Text>
                                <Form.Control id="expense-search" aria-label="Search expense records" placeholder="Title or description" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Label htmlFor="expense-month">Accounting month</Form.Label>
                            <Form.Control id="expense-month" aria-label="Filter expenses by month" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} title="Filter all modules by month" />
                        </Col>
                        <Col md={3}>
                            <Form.Label htmlFor="expense-category">Manual expense category</Form.Label>
                            <SafeSelect id="expense-category" aria-label="Filter manual expenses by category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} title="Filter the manual expenses list">
                                <option value="ALL">All Categories</option>
                                <option value="OPERATIONAL">Operational</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="RENT">Rent</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                                <option value="SUPPLIER_MIGRATION_PAYMENT">Migration Supplier Payment</option>
                                <option value="OTHER">Other</option>
                            </SafeSelect>
                        </Col>
                        <Col className="text-end">
                            {filterMonth && <Badge bg="primary" className="py-2 px-3 fs-6">Showing: {filterMonth}</Badge>}
                            {!filterMonth && <Badge bg="secondary" className="py-2 px-3 fs-6">Showing: All Time</Badge>}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* ═══════════════════ SECTION 1 — OUTFLOW BREAKDOWN ═══════════════════ */}
            <Card className="expenses-panel expenses-outflow-panel">
                <Card.Header className="expenses-section-heading">
                    <span>Expense &amp; outflow breakdown</span><small>Paid and outstanding commitments across finance modules</small>
                </Card.Header>
                <Card.Body>
                    {/* 3 Summary Stat Boxes */}
                    <Row className="g-3 mb-4 expenses-summary-grid">
                        <Col md={4}>
                            <div className="expenses-summary expenses-summary-paid">
                                <div className="expenses-summary-label">Paid out</div>
                                <div className="expenses-summary-value">Rs. {fmt(totalPaidOut)}</div>
                                <small>Funds already disbursed</small>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="expenses-summary expenses-summary-payable">
                                <div className="expenses-summary-label">Payables</div>
                                <div className="expenses-summary-value">Rs. {fmt(totalPayable)}</div>
                                <small>Outstanding obligations</small>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="expenses-summary expenses-summary-total">
                                <div className="expenses-summary-label">Total committed</div>
                                <div className="expenses-summary-value">Rs. {fmt(totalCommitted)}</div>
                                <small>Paid plus payable</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Breakdowns */}
                    <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k)}
                        className="expenses-breakdown-tabs"
                        variant="pills"
                    >
                        <Tab eventKey="category" title="By Expense Category">
                            <Row className="g-4 align-items-stretch mt-1">
                                <Col md={4}>
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={outflowCategories.filter(d => d.paid > 0)}
                                                    cx="50%" cy="45%"
                                                    innerRadius={70} outerRadius={95}
                                                    paddingAngle={3} dataKey="paid" nameKey="name"
                                                    labelLine={false} label={<CustomPctLabel />}
                                                >
                                                    {outflowCategories.filter(d => d.paid > 0).map((e, i) => (
                                                        <Cell key={i} fill={e.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val) => `Rs. ${fmt(val)}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                                <Col md={8}>
                                    <div className="d-flex flex-column justify-content-between h-100">
                                        <div className="text-muted small fw-bold text-uppercase mb-2">Category Breakdown</div>
                                        <div className="d-flex flex-column gap-2 flex-grow-1 h-100">
                                            {outflowCategories.map((c, idx) => (
                                                <div key={idx} className="expenses-breakdown-row" style={{ borderLeftColor: c.color }}>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="fs-3">{c.icon}</div>
                                                        <div>
                                                            <div className="fw-bold">{c.name}</div>
                                                            <small className="text-muted">{c.sub}</small>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold" style={{ color: '#198754' }}>Rs. {fmt(c.paid)}</div>
                                                        {(c.payable > 0) && <small style={{ color: '#dc3545', fontSize: '0.75rem' }}>+ Rs. {fmt(c.payable)} pending</small>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Tab>
                        <Tab eventKey="method" title="By Payment Method">
                            <Row className="g-4 align-items-stretch mt-1">
                                <Col md={4}>
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={methodCategories}
                                                    cx="50%" cy="45%"
                                                    innerRadius={70} outerRadius={95}
                                                    paddingAngle={3} dataKey="paid" nameKey="name"
                                                    labelLine={false} label={<CustomPctLabel />}
                                                >
                                                    {methodCategories.map((e, i) => (
                                                        <Cell key={i} fill={e.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val) => `Rs. ${fmt(val)}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                                <Col md={8}>
                                    <div className="d-flex flex-column justify-content-between h-100">
                                        <div className="text-muted small fw-bold text-uppercase mb-2">Method Breakdown (Paid Only)</div>
                                        <div className="d-flex flex-column gap-2 flex-grow-1 h-100">
                                            {methodCategories.map((c, idx) => (
                                                <div key={idx} className="expenses-breakdown-row" style={{ borderLeftColor: c.color }}>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="fs-3">{c.icon}</div>
                                                        <div>
                                                            <div className="fw-bold text-capitalize">{c.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold" style={{ color: '#198754' }}>Rs. {fmt(c.paid)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* ═══════════════════ SECTION 2 — MONTHLY TREND ═══════════════════ */}
            <Card className="expenses-panel expenses-trend-panel">
                <Card.Body>
                    <div className="expenses-trend-heading"><span>Monthly expense trend</span><small>Manual expense records across the selected period</small></div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: '#6c757d', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis 
                                tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} 
                                tick={{ fill: '#6c757d', fontSize: 12 }} 
                                axisLine={false} tickLine={false} />
                            <Tooltip 
                                formatter={(v) => [`Rs. ${fmt(v)}`, 'Manual Expenses']} 
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            />
                            <Bar dataKey="amount" fill="#0d6efd" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card.Body>
            </Card>

            {/* ═══════════════════ SECTION 3 — EXPENSE TABLE ═══════════════════ */}
            <Card className="expenses-panel expenses-records-panel">
                <Card.Header className="bg-white py-3 border-bottom-0">
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">Manual Expense Records</span>
                        <div className="text-end">
                            <span className="fw-semibold text-primary">Rs. {fmt(totalFiltered)}</span>
                            <small className="text-muted ms-2">({filteredExpenses.length} records)</small>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="expenses-table-scroll" tabIndex="0" aria-label="Manual expense records table, horizontally scrollable on smaller screens">
                    <Table hover className="expenses-table mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Date</th>
                                <th>Category</th>
                                <th>Title / Description</th>
                                <th className="text-end">Amount</th>
                                <th>Status</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.length === 0 ? (
                                <tr className="expenses-empty-row"><td colSpan="6"><strong>No matching expenses</strong><span>Adjust the search, month, or category filters.</span></td></tr>
                            ) : filteredExpenses.map(e => (
                                <tr key={e.id}>
                                    <td data-label="Date" className="expenses-date">{e.expenseDate}</td>
                                    <td data-label="Category">
                                        {e.category === 'SUPPLIER_PAYMENT'
                                            ? <Badge bg="warning" text="dark">Supplier Payment</Badge>
                                            : <Badge bg="secondary">{e.category}</Badge>}
                                    </td>
                                    <td data-label="Title / description" className="expenses-title-cell">
                                        {e.category === 'SUPPLIER_PAYMENT' && e.projectId ? (
                                            <button type="button" className="expenses-record-link" onClick={() => handleGRNClick(e.projectId)} aria-label={`Open supplier expense ${e.title}`}>
                                                {e.title} <i className="bi bi-box-arrow-up-right ms-1 small text-primary"></i>
                                            </button>
                                        ) : <span className="fw-medium">{e.title}</span>}
                                        {e.description && <small>{e.description}</small>}
                                    </td>
                                    <td data-label="Amount" className="expenses-amount">Rs. {fmt(e.amount)}</td>
                                    <td data-label="Status">{e.status}</td>
                                    <td data-label="Method">
                                        {e.paymentMethod === 'CARD'
                                            ? <Badge style={{ background: '#AF19FF' }}>💳 Card</Badge>
                                            : e.paymentMethod}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Create Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered dialogClassName="expense-entry-modal">
                <Modal.Header closeButton><div><Modal.Title>Record new expense</Modal.Title><p className="mb-0">Enter the transaction details and funding account.</p></div></Modal.Header>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}><Form.Group><Form.Label htmlFor="new-expense-title">Title *</Form.Label><Form.Control id="new-expense-title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label>Category</Form.Label>
                            <SafeSelect value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option value="OPERATIONAL">Operational</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="RENT">Rent</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="OTHER">Other</option>
                            </SafeSelect>
                        </Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label htmlFor="new-expense-amount">Amount (LKR) *</Form.Label><Form.Control id="new-expense-amount" type="number" min="0" step="0.01" inputMode="decimal" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group><Form.Label>Date</Form.Label><SafeDatePicker name="expenseDate" value={formData.expenseDate} onChange={e => setFormData({ ...formData, expenseDate: e.target.value })} /></Form.Group></Col>
                        <Col md={12}>
                            <PaymentAccountPicker 
                                required={true}
                                value={formData.paymentAccountId}
                                onChange={(details) => {
                                    setFormData(f => ({
                                        ...f,
                                        paymentAccountId: details.paymentAccountId,
                                        paymentAccountName: details.paymentAccountName,
                                        paymentAccountType: details.paymentAccountType,
                                        paymentMethod: details.paymentMethod
                                    }));
                                    // Fetch account balance for overdraft check
                                    if (details.paymentAccountId) {
                                        api.get(`/finance/accounts/${details.paymentAccountId}`)
                                            .then(res => setAccountBalance(Number(res.data.balance) || 0))
                                            .catch(() => setAccountBalance(null));
                                    } else {
                                        setAccountBalance(null);
                                    }
                                }}
                            />
                        </Col>
                        <Col md={6}><Form.Group><Form.Label>Reference / Cheque No</Form.Label><Form.Control value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} /></Form.Group></Col>
                        <Col md={12}><Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></Form.Group></Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Expense</Button>
                </Modal.Footer>
            </Modal>

            {selectedGRN && (
                <GRNPaymentModal
                    grn={selectedGRN}
                    onClose={() => { setSelectedGRN(null); loadExpenses(); loadBreakdownData(); }}
                />
            )}

            <OverdraftConfirmModal
                show={showOverdraftModal}
                amount={formData.amount}
                balance={accountBalance}
                accountName={formData.paymentAccountName}
                onConfirm={() => { setShowOverdraftModal(false); submitExpense(true); }}
                onCancel={() => setShowOverdraftModal(false)}
            />
        </Container>
    );
}
