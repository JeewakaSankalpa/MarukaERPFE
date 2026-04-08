import dayjs from 'dayjs';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Button, Table, Badge, Spin, Modal, Form, Input, InputNumber, Upload, Tabs, Select, Tag, Divider, DatePicker } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DollarOutlined, BankOutlined, PlusOutlined, UploadOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../api/api';
import ProjectFinancialReport from '../finance/ProjectFinancialReport';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';

const { TabPane } = Tabs;

const fmtAmt = (val, cur = 'LKR') => {
    const n = parseFloat(val) || 0;
    return `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ProjectFinanceTab = ({ projectId, currency = 'LKR' }) => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);

    // Request Funds State
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestForm] = Form.useForm();

    // Add Expense State
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [expenseForm] = Form.useForm();
    const [fileList, setFileList] = useState([]);

    // Return Funds State
    const [returnModalVisible, setReturnModalVisible] = useState(false);
    const [returnLoading, setReturnLoading] = useState(false);
    const [returnForm] = Form.useForm();

    // Add Payment State
    const [payModalVisible, setPayModalVisible] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [payForm] = Form.useForm();
    const [payFileList, setPayFileList] = useState([]);
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState(null);

    // Lists
    const [expenses, setExpenses] = useState([]);
    const [requests, setRequests] = useState([]);
    const [payments, setPayments] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);

    const fetchAccount = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/project-accounts/${projectId}`);
            setAccount(res.data || {});
        } catch (error) {
            console.error("Failed to fetch project account", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchExpenses = useCallback(async () => {
        try {
            const res = await api.get(`/project-accounts/${projectId}/petty-cash/expenses`);
            setExpenses(res.data || []);
        } catch (e) {
            console.error("Failed to fetch project expenses", e);
        }
    }, [projectId]);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get(`/project-accounts/${projectId}/petty-cash/requests`);
            setRequests(res.data || []);
        } catch (e) { console.error(e); }
    }, [projectId]);

    const fetchInventory = useCallback(async () => {
        try {
            const res = await api.get(`/inventory/project/${projectId}`);
            setInventoryItems(res.data || []);
        } catch (e) { console.error("Failed to fetch inventory", e); }
    }, [projectId]);

    const fetchPayments = useCallback(async () => {
        try {
            const res = await api.get(`/project-accounts/${projectId}/payments`);
            setPayments(res.data || []);
        } catch (e) { console.error(e); }
    }, [projectId]);

    const fetchBankAccounts = useCallback(async () => {
        try {
            const res = await api.get('/finance/accounts');
            setBankAccounts(res.data.filter(a => a.type === 'ASSET'));
        } catch (e) {
            console.error("Failed to fetch accounts", e);
        }
    }, []);

    useEffect(() => {
        if (projectId) {
            fetchAccount();
            fetchRequests();
            fetchPayments();
            fetchExpenses();
            fetchInventory();
        }
    }, [projectId, fetchAccount, fetchRequests, fetchExpenses, fetchInventory, fetchPayments]);

    // --- Derived totals ---
    const totalPettyCashExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalConsumedValue = inventoryItems.reduce((s, i) => s + (parseFloat(i.totalConsumedValue) || 0), 0);
    const totalProjectExpenses = totalPettyCashExpenses + totalConsumedValue;

    const handleRequestFunds = async (values) => {
        setRequestLoading(true);
        try {
            await api.post(`/project-accounts/${projectId}/petty-cash/request`, {
                amount: values.amount,
                reason: values.reason
            });
            toast.success('Fund request submitted successfully');
            setRequestModalVisible(false);
            requestForm.resetFields();
            fetchRequests();
        } catch (e) {
            toast.error('Failed to submit request');
        } finally {
            setRequestLoading(false);
        }
    };

    const handleAddPayment = async (values) => {
        if (payFileList.length === 0) {
            toast.warn('Please upload a payment slip');
            return;
        }
        if (!selectedPaymentAccount) {
            toast.warn('Please select a payment account');
            return;
        }
        setPayLoading(true);
        const formData = new FormData();
        formData.append('amount', values.amount);
        const paidAtVal = values.paidAt;
        const paidAtStr = paidAtVal
            ? (typeof paidAtVal.format === 'function' ? paidAtVal.format('YYYY-MM-DD') : paidAtVal)
            : new Date().toISOString().split('T')[0];
        formData.append('paidAt', paidAtStr);
        formData.append('note', values.note || '');
        formData.append('paymentAccountId', selectedPaymentAccount.id);
        formData.append('file', payFileList[0].originFileObj || payFileList[0]);

        try {
            await api.post(`/project-accounts/${projectId}/payments/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Payment recorded successfully');
            setPayModalVisible(false);
            payForm.resetFields();
            setPayFileList([]);
            setSelectedPaymentAccount(null);
            fetchAccount();
            fetchPayments();
        } catch (e) {
            toast.error('Failed to record payment');
        } finally {
            setPayLoading(false);
        }
    };

    const handleAddExpense = async (values) => {
        if (fileList.length === 0) {
            toast.error('Receipt/Invoice is required. Please upload a file before submitting.');
            return;
        }
        setExpenseLoading(true);
        const formData = new FormData();
        const expenseData = {
            title: values.title,
            description: values.description,
            amount: values.amount,
            category: 'Project Expense',
            expenseDate: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0]
        };
        formData.append('data', JSON.stringify(expenseData));
        if (fileList.length > 0) {
            formData.append('file', fileList[0].originFileObj || fileList[0]);
        }

        try {
            await api.post(`/project-accounts/${projectId}/expenses`, formData);
            toast.success('Expense added successfully');
            setExpenseModalVisible(false);
            expenseForm.resetFields();
            setFileList([]);
            fetchAccount(); // Update balance
            fetchExpenses(); // Refresh expense list
        } catch (e) {
            const msg = e.response?.data?.message || e.message || 'Failed to add expense';
            toast.error(msg);
        } finally {
            setExpenseLoading(false);
        }
    };

    const handleReturnFunds = async (values) => {
        setReturnLoading(true);
        try {
            await api.post(`/project-accounts/${projectId}/petty-cash/return`, {
                amount: values.amount,
                sourceAccountId: values.targetAccountId
            });
            toast.success('Funds returned successfully');
            setReturnModalVisible(false);
            returnForm.resetFields();
            fetchAccount();
        } catch (e) {
            const msg = e.response?.data?.message || e.message || 'Failed to return funds';
            toast.error(msg);
        } finally {
            setReturnLoading(false);
        }
    };

    const pendingExpensesSum = expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + (e.amount || 0), 0);
    const availablePettyCash = (account?.pettyCashBalance || 0) - pendingExpensesSum;

    return (
        <div className="mt-3">
            {loading && <div className="text-center p-3"><Spin /></div>}

            {/* Summary Cards */}
            {!loading && account && (
                <Row gutter={16} className="mb-4">
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Project Value"
                                value={account.totalProjectValue || account.totalAmount}
                                precision={2}
                                prefix={currency === 'USD' ? '$' : 'Rs.'}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Received"
                                value={account.totalReceived || account.paidAmount}
                                precision={2}
                                prefix={currency === 'USD' ? '$' : 'Rs.'}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Balance Due"
                                value={account.balance}
                                precision={2}
                                prefix={currency === 'USD' ? '$' : 'Rs.'}
                                valueStyle={{ color: account.balance > 0 ? '#cf1322' : '#3f8600' }}
                            />
                            <Button className="mt-2" type="primary" block icon={<PlusOutlined />} onClick={() => setPayModalVisible(true)}>
                                Add Payment
                            </Button>
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Available Petty Cash"
                                value={availablePettyCash}
                                precision={2}
                                prefix={<BankOutlined />}
                                valueStyle={{ color: availablePettyCash < 0 ? 'red' : '#1890ff' }}
                            />
                            {pendingExpensesSum > 0 && (
                                <div className="text-muted small mt-1">
                                    Includes {pendingExpensesSum.toLocaleString()} in pending expenses
                                </div>
                            )}
                            <div className="d-flex gap-1 mt-2 flex-wrap">
                                <Button type="link" size="small" onClick={() => setRequestModalVisible(true)}>
                                    Request
                                </Button>
                                <Button type="link" size="small" onClick={() => setExpenseModalVisible(true)}>
                                    Expense
                                </Button>
                                <Button type="link" size="small" danger onClick={() => { fetchBankAccounts(); setReturnModalVisible(true); }}>
                                    Return
                                </Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <Tabs defaultActiveKey="1">
                {/* --- Fund Requests --- */}
                <TabPane tab="Fund Requests" key="1">
                    <Table
                        dataSource={requests}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 10 }}
                        columns={[
                            { title: 'Date', dataIndex: 'createdAt', render: d => d ? new Date(d).toLocaleDateString() : '-' },
                            { title: 'Amount', dataIndex: 'amount', render: v => fmtAmt(v, currency) },
                            { title: 'Reason', dataIndex: 'reason' },
                            {
                                title: 'Status', dataIndex: 'status', render: s => (
                                    <Tag color={s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'}>
                                        {s}
                                    </Tag>
                                )
                            },
                            { title: 'Requested By', dataIndex: 'requestedBy' },
                            { title: 'Approved By', dataIndex: 'approvedBy', render: v => v || '-' }
                        ]}
                    />
                </TabPane>
                <TabPane tab="Petty Cash Expenses" key="5">
                    <Table
                        dataSource={expenses}
                        rowKey="id"
                        size="small"
                        columns={[
                            { title: 'Date', dataIndex: 'expenseDate', render: d => dayjs(d).format('YYYY-MM-DD') },
                            { title: 'Title', dataIndex: 'title' },
                            { title: 'Amount', dataIndex: 'amount', render: v => `${currency} ${v.toLocaleString()}` },
                            { title: 'Description', dataIndex: 'description' },
                            { title: 'Status', dataIndex: 'status', render: s => <Badge status={s === 'PENDING' ? 'warning' : s === 'PAID' ? 'success' : 'error'} text={s} /> },
                            {
                                title: 'Receipt', dataIndex: 'attachmentUrl', render: url => url ? (
                                    <Button type="link" icon={<FileTextOutlined />} onClick={() => window.open(url, '_blank')}>View File</Button>
                                ) : '-'
                            }
                        ]}
                    />
                </TabPane>
                <TabPane tab="Payments (Income)" key="4">
                    <Table
                        dataSource={payments}
                        rowKey="id"
                        size="small"
                        columns={[
                            { title: 'Date', dataIndex: 'paidAt', render: d => new Date(d).toLocaleDateString() },
                            { title: 'Amount', dataIndex: 'amount', render: v => `${currency} ${v.toLocaleString()}` },
                            { title: 'Note', dataIndex: 'note' },
                            {
                                title: 'Slip', dataIndex: 'fileUrl', render: url => url ? (
                                    <Button type="link" icon={<FileTextOutlined />} onClick={() => window.open(url, '_blank')}>View</Button>
                                ) : '-'
                            },
                            { title: 'Added By', dataIndex: 'createdBy' }
                        ]}
                    />
                </TabPane>
                <TabPane tab="Transaction History" key="2">
                    <TransactionHistory projectId={projectId} currency={currency} />
                </TabPane>

                {/* --- Financial Report --- */}
                <TabPane tab="Financial Report" key="3">
                    <ProjectFinancialReport projectId={projectId} currency={currency} />
                </TabPane>
            </Tabs>

            {/* Request Funds Modal */}
            <Modal
                title="Request Petty Cash Funds"
                open={requestModalVisible}
                onCancel={() => setRequestModalVisible(false)}
                onOk={() => requestForm.submit()}
                confirmLoading={requestLoading}
            >
                <Form form={requestForm} layout="vertical" onFinish={handleRequestFunds}>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix={currency} min={0} />
                    </Form.Item>
                    <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Return Funds Modal */}
            <Modal
                title="Return Excess Funds to Finance"
                open={returnModalVisible}
                onCancel={() => setReturnModalVisible(false)}
                onOk={() => returnForm.submit()}
                confirmLoading={returnLoading}
            >
                <Form form={returnForm} layout="vertical" onFinish={handleReturnFunds}>
                    <Form.Item name="amount" label="Amount to Return" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix={currency} min={0} max={account?.pettyCashBalance} />
                    </Form.Item>
                    <Form.Item name="targetAccountId" label="Return To (Bank/Cash Account)" rules={[{ required: true }]}>
                        <Select placeholder="Select Account">
                            {bankAccounts.map(acc => (
                                <Select.Option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.code}) — Bal: {fmtAmt(acc.balance, currency)}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Expense Modal */}
            <Modal
                title="Add Project Expense"
                open={expenseModalVisible}
                onCancel={() => setExpenseModalVisible(false)}
                onOk={() => expenseForm.submit()}
                confirmLoading={expenseLoading}
            >
                <Form form={expenseForm} layout="vertical" onFinish={handleAddExpense}>
                    <Form.Item name="title" label="Expense Title" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Transport, Lunch" />
                    </Form.Item>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix={currency} min={0} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label="Receipt/Invoice" required tooltip="A receipt or invoice file must be attached to record an expense."
                        validateStatus={fileList.length === 0 ? '' : 'success'}
                    >
                        <Upload
                            beforeUpload={file => { setFileList([file]); return false; }}
                            onRemove={() => setFileList([])}
                            fileList={fileList}
                            maxCount={1}
                        >
                            <Button icon={<UploadOutlined />}>Click to Upload</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Payment Modal */}
            <Modal
                title="Record Customer Payment"
                open={payModalVisible}
                onCancel={() => setPayModalVisible(false)}
                onOk={() => payForm.submit()}
                confirmLoading={payLoading}
            >
                <Form form={payForm} layout="vertical" onFinish={handleAddPayment}>
                    <Form.Item style={{ marginBottom: '12px' }}>
                        <PaymentAccountPicker
                            required={true}
                            onChange={(details) => {
                                setSelectedPaymentAccount({
                                    id: details.paymentAccountId,
                                    name: details.paymentAccountName,
                                    type: details.paymentAccountType
                                });
                            }}
                        />
                        {!selectedPaymentAccount && <div style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px" }}>* Please select an account.</div>}
                    </Form.Item>
                    <Form.Item name="amount" label="Amount Received" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix={currency} min={0} />
                    </Form.Item>
                    <Form.Item name="paidAt" label="Payment Date" initialValue={dayjs()}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="note" label="Reference (Check No, Bank Ref, etc.)" rules={[{ required: true, message: 'Please provide a reference number' }]}>
                        <Input placeholder="e.g., Check #123456" />
                    </Form.Item>
                    <Form.Item label="Payment Slip" required>
                        <Upload
                            beforeUpload={file => { setPayFileList([file]); return false; }}
                            onRemove={() => setPayFileList([])}
                            fileList={payFileList}
                            maxCount={1}
                        >
                            <Button icon={<UploadOutlined />}>Click to Upload Slip</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </div>
    );
};

// ─── Transaction History sub-component ────────────────────────────────────────
const TransactionHistory = ({ projectId, currency = 'LKR' }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const eventsRes = await api.get(`/project-accounts/${projectId}/events`);
                setTransactions(eventsRes.data.content || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, [projectId]);

    const typeConfig = {
        PAYMENT_RECEIVED: { color: 'green', icon: <ArrowDownOutlined />, label: 'Payment Received' },
        PETTY_CASH_ALLOCATED: { color: 'blue', icon: <SwapOutlined />, label: 'Funds Allocated' },
        PETTY_CASH_RETURNED: { color: 'orange', icon: <ArrowUpOutlined />, label: 'Funds Returned' },
        EXPENSE_ADDED: { color: 'red', icon: <ArrowUpOutlined />, label: 'Expense' },
    };

    const columns = [
        { title: 'Date', dataIndex: 'at', render: d => d ? new Date(d).toLocaleDateString() : '-', width: 100 },
        {
            title: 'Type', dataIndex: 'type', width: 160,
            render: t => {
                const cfg = typeConfig[t] || { color: 'default', label: t };
                return <Tag color={cfg.color}>{cfg.label || t}</Tag>;
            }
        },
        {
            title: 'Amount', dataIndex: 'deltaPaid', width: 140,
            render: val => {
                if (val == null) return '-';
                const n = parseFloat(val);
                const color = n < 0 ? '#cf1322' : '#3f8600';
                const sign = n > 0 ? '+' : '';
                return <span style={{ color, fontWeight: 700 }}>{sign}{fmtAmt(Math.abs(n), currency)}</span>;
            }
        },
        { title: 'Details', dataIndex: 'note', render: v => v || '-' },
        { title: 'By', dataIndex: 'actor', render: v => v || 'system', width: 100 }
    ];

    const totalIn = transactions.filter(t => (parseFloat(t.deltaPaid) || 0) > 0).reduce((s, t) => s + (parseFloat(t.deltaPaid) || 0), 0);
    const totalOut = transactions.filter(t => (parseFloat(t.deltaPaid) || 0) < 0).reduce((s, t) => s + Math.abs(parseFloat(t.deltaPaid) || 0), 0);

    return (
        <div>
            <Row gutter={16} className="mb-3">
                <Col span={8}>
                    <Card size="small" bordered={false} style={{ background: '#f6ffed' }}>
                        <Statistic title="Total In" value={totalIn} precision={2} prefix="Rs." valueStyle={{ color: '#3f8600', fontSize: 16 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered={false} style={{ background: '#fff1f0' }}>
                        <Statistic title="Total Out" value={totalOut} precision={2} prefix="Rs." valueStyle={{ color: '#cf1322', fontSize: 16 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered={false} style={{ background: '#e6f7ff' }}>
                        <Statistic title="Net" value={totalIn - totalOut} precision={2} prefix="Rs."
                            valueStyle={{ color: (totalIn - totalOut) >= 0 ? '#1890ff' : '#cf1322', fontSize: 16 }} />
                    </Card>
                </Col>
            </Row>
            <Table
                dataSource={transactions}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 15 }}
            />
        </div>
    );
};

export default ProjectFinanceTab;
