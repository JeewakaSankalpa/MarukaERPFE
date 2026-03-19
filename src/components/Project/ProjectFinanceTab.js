import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Table, Badge, Spin, Modal, Form, Input, InputNumber, Upload, Tabs, Select } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DollarOutlined, BankOutlined, PlusOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../api/api';
import ProjectFinancialReport from '../finance/ProjectFinancialReport';


const { TabPane } = Tabs;

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
    const [bankAccounts, setBankAccounts] = useState([]);

    // Lists
    const [expenses, setExpenses] = useState([]);
    const [requests, setRequests] = useState([]);

    const fetchAccount = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/project-accounts/${projectId}`);
            setAccount(res.data || {});
        } catch (error) {
            console.error("Failed to fetch project account", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpenses = async () => {
        try {
            const res = await api.get(`/finance/expenses/search?projectId=${projectId}`);
            setExpenses(res.data || []);
        } catch (e) {
            console.error("Failed to fetch expenses", e);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get(`/project-accounts/${projectId}/petty-cash/requests`);
            setRequests(res.data || []);
        } catch (e) { console.error(e); }
    }

    const fetchBankAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            // Allow returning funds to any Asset account
            setBankAccounts(res.data.filter(a => a.type === 'ASSET'));
        } catch (e) {
            console.error("Failed to fetch accounts", e);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchAccount();
            fetchRequests();
            fetchExpenses();
        }
    }, [projectId]);

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

    const handleAddExpense = async (values) => {
        setExpenseLoading(true);
        const formData = new FormData();
        const expenseData = {
            title: values.title,
            description: values.description,
            amount: values.amount,
            category: 'Project Expense', // Fixed category for now
            expenseDate: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0]
        };
        formData.append('data', JSON.stringify(expenseData));
        if (fileList.length > 0) {
            formData.append('file', fileList[0].originFileObj);
        }

        try {
            await api.post(`/project-accounts/${projectId}/expenses`, formData);
            toast.success('Expense added successfully');
            setExpenseModalVisible(false);
            expenseForm.resetFields();
            setFileList([]);
            fetchAccount(); // Update balance
            fetchExpenses(); // Update expenses list
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
                sourceAccountId: values.targetAccountId // Using same DTO field name for target
            });
            toast.success('Funds returned successfully');
            setReturnModalVisible(false);
            returnForm.resetFields();
            fetchAccount();
        } catch (e) {
            toast.error('Failed to return funds');
        } finally {
            setReturnLoading(false);
        }
    };

    return (
        <div className="mt-3">
            {loading && <Spin />}

            {!loading && account && (
                <Row gutter={16} className="mb-4">
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Project Value"
                                value={account.totalAmount}
                                precision={2}
                                prefix={currency === 'USD' ? '$' : 'Rs.'}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Received"
                                value={account.paidAmount}
                                precision={2}
                                prefix={currency === 'USD' ? '$' : 'Rs.'}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Petty Cash Balance"
                                value={account.pettyCashBalance}
                                precision={2}
                                prefix={<BankOutlined />}
                                valueStyle={{ color: account.pettyCashBalance < 0 ? 'red' : '#1890ff' }}
                            />
                            <div className="d-flex gap-2 mt-2 flex-wrap">
                                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setRequestModalVisible(true)}>
                                    Request Funds
                                </Button>
                                <Button size="small" icon={<DollarOutlined />} onClick={() => setExpenseModalVisible(true)}>
                                    Add Expense
                                </Button>
                                <Button size="small" danger onClick={() => { fetchBankAccounts(); setReturnModalVisible(true); }}>
                                    Return Excess
                                </Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <Tabs defaultActiveKey="1">
                <TabPane tab="Fund Requests" key="1">
                    <Table
                        dataSource={requests}
                        rowKey="id"
                        size="small"
                        columns={[
                            { title: 'Date', dataIndex: 'createdAt', render: d => new Date(d).toLocaleDateString() },
                            { title: 'Amount', dataIndex: 'amount', render: v => `${currency} ${v}` },
                            { title: 'Reason', dataIndex: 'reason' },
                            { title: 'Status', dataIndex: 'status', render: s => <Badge status={s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'processing'} text={s} /> },
                            { title: 'Requested By', dataIndex: 'requestedBy' }
                        ]}
                    />
                </TabPane>
                <TabPane tab="Project Expenses" key="4">
                    <Table
                        dataSource={expenses}
                        rowKey="id"
                        size="small"
                        columns={[
                            { title: 'Date', dataIndex: 'expenseDate', render: d => new Date(d).toLocaleDateString() },
                            { title: 'Title', dataIndex: 'title' },
                            { title: 'Amount', dataIndex: 'amount', render: v => <span style={{color: 'red'}}>{currency} {v}</span> },
                            { title: 'Description', dataIndex: 'description' },
                            { title: 'Attachment', dataIndex: 'attachmentUrl', render: url => url ? <a href={url} target="_blank" rel="noreferrer">View File</a> : 'None' }
                        ]}
                    />
                </TabPane>
                <TabPane tab="Transaction History" key="2">
                    <TransactionHistory projectId={projectId} />
                </TabPane>
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
                        <Select placeholder="Select Bank/Cash Account">
                            {bankAccounts.map(acc => (
                                <Select.Option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.code})
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
                        <Input placeholder="e.g., Lunch for team" />
                    </Form.Item>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix={currency} min={0} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label="Bill/Invoice (Optional)">
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
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </div>
    );
};

const TransactionHistory = ({ projectId }) => {
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

    const columns = [
        { title: 'Date', dataIndex: 'at', render: d => new Date(d).toLocaleDateString() },
        { title: 'Type', dataIndex: 'type' },
        {
            title: 'Amount Change', dataIndex: 'deltaPaid',
            render: (val) => val ? <span style={{ color: val < 0 ? 'red' : 'green', fontWeight: 'bold' }}>{val}</span> : '-'
        },
        { title: 'Details', dataIndex: 'note' },
        { title: 'Actor', dataIndex: 'actor' }
    ];

    return <Table dataSource={transactions} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />;
};

export default ProjectFinanceTab;
