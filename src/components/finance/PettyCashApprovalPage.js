import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Select, Input, Tag, Card, Tabs } from 'antd';
import { ArrowLeft, ClipboardCheck, ExternalLink, RefreshCw, Search, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import './PettyCashApprovalPage.css';

const PettyCashApprovalPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [requestSearch, setRequestSearch] = useState('');
    const [expenseSearch, setExpenseSearch] = useState('');

    // Approval Modal for Requests
    const [approvalVisible, setApprovalVisible] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [form] = Form.useForm();

    // Approval Modal for Expenses
    const [expenseApprovalVisible, setExpenseApprovalVisible] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);
    const [expenseApprovalLoading, setExpenseApprovalLoading] = useState(false);

    const fetchRequestsAndExpenses = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const [reqsRes, expRes] = await Promise.all([
                api.get('/project-accounts/petty-cash/requests'),
                api.get('/project-accounts/petty-cash/expenses/pending')
            ]);
            setRequests(reqsRes.data || []);
            setExpenses(expRes.data || []);
        } catch (e) {
            console.error("Fetch error:", e);
            if (e.response && e.response.status !== 404) {
                setLoadError('Approval queues could not be loaded. Check the connection and try again.');
                toast.error("Failed to load petty cash data");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequestsAndExpenses();
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            // Filter Asset/Cash/Bank accounts
            setAccounts((res.data || []).filter(a => a.type === 'ASSET' && (a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank'))));
        } catch (e) { console.error(e); }
    };

    const handleApproveClick = (record) => {
        setCurrentRequest(record);
        setApprovalVisible(true);
        form.setFieldsValue({
            approvedAmount: record.amount,
            notes: ""
        });
    };

    const onFinish = async (values) => {
        try {
            setApprovalLoading(true);
            const payload = {
                status: "APPROVED",
                approvedAmount: values.approvedAmount,
                approvalNotes: values.notes,
                sourceAccountId: values.accountId,
                approvedBy: localStorage.getItem("username")
            };

            await api.post(`/project-accounts/petty-cash/requests/${currentRequest.id}/approve`, payload);
            toast.success("Request approved successfully");
            setApprovalVisible(false);
            fetchRequestsAndExpenses();
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.message || e.response?.data || "Failed to approve request");
        } finally {
            setApprovalLoading(false);
        }
    };

    const handleReject = async () => {
        const notes = form.getFieldValue("notes");
        if (!notes) {
            toast.warning("Please provide rejection notes");
            return;
        }
        try {
            setApprovalLoading(true);
            const payload = {
                status: "REJECTED",
                approvalNotes: notes,
                approvedBy: localStorage.getItem("username")
            };
            await api.post(`/project-accounts/petty-cash/requests/${currentRequest.id}/reject`, payload);
            toast.success("Request rejected");
            setApprovalVisible(false);
            fetchRequestsAndExpenses();
        } catch (e) {
            toast.error("Failed to reject request");
        } finally {
            setApprovalLoading(false);
        }
    };

    const handleExpenseApproveClick = (record) => {
        setCurrentExpense(record);
        setExpenseApprovalVisible(true);
    };

    const filteredRequests = requests.filter(record => {
        const query = requestSearch.trim().toLowerCase();
        return !query || [record.projectName, record.requestedBy, record.category, record.description]
            .some(value => String(value || '').toLowerCase().includes(query));
    });
    const filteredExpenses = expenses.filter(record => {
        const query = expenseSearch.trim().toLowerCase();
        return !query || [record.projectId, record.title, record.description]
            .some(value => String(value || '').toLowerCase().includes(query));
    });
    const requestedTotal = requests.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const expenseTotal = expenses.reduce((sum, record) => sum + Number(record.amount || 0), 0);

    const onExpenseApprove = async () => {
        try {
            setExpenseApprovalLoading(true);
            await api.post(`/project-accounts/petty-cash/expenses/${currentExpense.id}/approve`);
            toast.success("Expense approved successfully");
            setExpenseApprovalVisible(false);
            fetchRequestsAndExpenses();
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.message || e.response?.data || "Failed to approve expense");
        } finally {
            setExpenseApprovalLoading(false);
        }
    };

    const onExpenseReject = async () => {
        try {
            setExpenseApprovalLoading(true);
            await api.post(`/project-accounts/petty-cash/expenses/${currentExpense.id}/reject`);
            toast.success("Expense rejected");
            setExpenseApprovalVisible(false);
            fetchRequestsAndExpenses();
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data?.message || e.response?.data || "Failed to reject expense");
        } finally {
            setExpenseApprovalLoading(false);
        }
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'requestDate',
            key: 'date',
            render: d => dayjs(d).format('YYYY-MM-DD HH:mm')
        },
        {
            title: 'Project',
            dataIndex: 'projectName',
            key: 'project',
        },
        {
            title: 'Requested By',
            dataIndex: 'requestedBy',
            key: 'requester',
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: c => <Tag color="blue">{c}</Tag>
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: a => <span className="fw-bold">LKR {a?.toLocaleString()}</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: s => (
                <Tag color={s === 'PENDING' ? 'orange' : s === 'APPROVED' ? 'green' : 'red'}>
                    {s}
                </Tag>
            )
        },
        {
            title: 'Receipt',
            key: 'receipt',
            render: (_, record) => record.receiptUrl ? (
                <Button size="small" icon={<ExternalLink size={14} />} onClick={() => window.open(record.receiptUrl, '_blank')}>
                    View
                </Button>
            ) : <span className="text-muted small">No File</span>
        },
            {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => record.status === 'PENDING' && (
                    <Button type="primary" size="small" onClick={() => handleApproveClick(record)}>
                        Review
                    </Button>
                )
            }
        ];

        const expenseColumns = [
            {
                title: 'Date',
                dataIndex: 'expenseDate',
                key: 'date',
                render: d => dayjs(d).format('YYYY-MM-DD')
            },
            {
                title: 'Project ID',
                dataIndex: 'projectId',
                key: 'project',
            },
            {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
            },
            {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                render: a => <span className="fw-bold">LKR {a?.toLocaleString()}</span>
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: s => <Tag color="orange">{s}</Tag>
            },
            {
                title: 'Receipt',
                key: 'receipt',
                render: (_, record) => record.attachmentUrl ? (
                    <Button size="small" icon={<ExternalLink size={14} />} onClick={() => window.open(record.attachmentUrl, '_blank')}>
                        View
                    </Button>
                ) : <span className="text-muted small">No File</span>
            },
            {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                    <Button type="primary" size="small" onClick={() => handleExpenseApproveClick(record)}>
                        Review
                    </Button>
                )
            }
        ];

        const approvalTabs = [
            { key:'1', label:<span>Fund requests <b>{requests.length}</b></span>, children:<><div className="petty-approval-toolbar"><div><strong>Pending fund requests</strong><span>Requests awaiting a source account and finance decision.</span></div><Input allowClear prefix={<Search size={15} aria-hidden="true" />} aria-label="Search fund requests" placeholder="Search project, requester, or category" value={requestSearch} onChange={event=>setRequestSearch(event.target.value)} /></div><div className="petty-approval-table" role="region" aria-label="Petty cash fund requests table" tabIndex="0"><Table dataSource={filteredRequests} columns={columns} rowKey="id" loading={loading} pagination={{pageSize:15}} locale={{emptyText:requestSearch?'No fund requests match your search':'No pending fund requests'}} /></div></> },
            { key:'2', label:<span>Pending expenses <b>{expenses.length}</b></span>, children:<><div className="petty-approval-toolbar"><div><strong>Submitted expenses</strong><span>Receipts awaiting ledger approval.</span></div><Input allowClear prefix={<Search size={15} aria-hidden="true" />} aria-label="Search pending expenses" placeholder="Search project or expense" value={expenseSearch} onChange={event=>setExpenseSearch(event.target.value)} /></div><div className="petty-approval-table" role="region" aria-label="Pending petty cash expenses table" tabIndex="0"><Table dataSource={filteredExpenses} columns={expenseColumns} rowKey="id" loading={loading} pagination={{pageSize:15}} locale={{emptyText:expenseSearch?'No expenses match your search':'No pending expenses'}} /></div></> }
        ];

        return (
            <main className="petty-approval-page" aria-labelledby="petty-approval-heading" aria-busy={loading}>
                <header className="petty-approval-header">
                    <div className="petty-approval-heading-group"><button type="button" className="petty-approval-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={19} aria-hidden="true" /></button><div><span className="petty-approval-eyebrow">Sales &amp; Finance</span><h1 id="petty-approval-heading">Petty cash approvals</h1><p>Review fund requests and submitted expenses before they affect cash accounts or the ledger.</p></div></div>
                    <Button className="petty-approval-refresh" icon={<RefreshCw size={16} aria-hidden="true" />} onClick={fetchRequestsAndExpenses} loading={loading}>Refresh queues</Button>
                </header>

                {loadError && <div className="petty-approval-error" role="alert"><div><strong>Unable to load approval queues</strong><span>{loadError}</span></div><Button danger onClick={fetchRequestsAndExpenses}>Try again</Button></div>}

                <section className="petty-approval-summary" aria-label="Pending petty cash summary">
                    <article><ClipboardCheck size={18} aria-hidden="true" /><div><span>Fund requests</span><strong>{requests.length}</strong><small>LKR {requestedTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</small></div></article>
                    <article><WalletCards size={18} aria-hidden="true" /><div><span>Pending expenses</span><strong>{expenses.length}</strong><small>LKR {expenseTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</small></div></article>
                    <aside><strong>Review control</strong><span>Opening a review is safe. Approve and reject actions post financial changes and remain integration-only.</span></aside>
                </section>

                <Card className="petty-approval-workspace">
                    <Tabs defaultActiveKey="1" className="petty-approval-tabs" items={approvalTabs} />
                </Card>

            <Modal
                title="Review Petty Cash Request"
                open={approvalVisible}
                onCancel={() => setApprovalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <div className="mb-3">
                    <p><strong>Description:</strong> {currentRequest?.description}</p>
                    <p><strong>Requested Amount:</strong> LKR {currentRequest?.amount.toLocaleString()}</p>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <div className="mb-3">
                    <Form.Item name="accountId" label="Source Account (Cash/Bank)" rules={[{ required: true }]}>
                        <Select placeholder="Select from where to pay">
                            {accounts.map(a => <Select.Option key={a.id} value={a.id}>{a.name} (Bal: {a.balance})</Select.Option>)}
                        </Select>
                    </Form.Item>
                    </div>

                    <Form.Item name="approvedAmount" label="Approved Amount" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>

                    <Form.Item name="notes" label="Approver Notes">
                        <Input.TextArea rows={3} placeholder="Add comments here..." />
                    </Form.Item>

                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Button onClick={handleReject} danger loading={approvalLoading}>Reject</Button>
                        <Button type="primary" htmlType="submit" loading={approvalLoading}>Approve & Post</Button>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Review Petty Cash Expense"
                open={expenseApprovalVisible}
                onCancel={() => setExpenseApprovalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <div className="mb-4">
                    <p><strong>Expense Title:</strong> {currentExpense?.title}</p>
                    <p><strong>Description:</strong> {currentExpense?.description || 'N/A'}</p>
                    <p><strong>Amount:</strong> LKR {currentExpense?.amount?.toLocaleString()}</p>
                    {currentExpense?.attachmentUrl && (
                        <p><strong>Receipt:</strong> <a href={currentExpense.attachmentUrl} target="_blank" rel="noreferrer">View File</a></p>
                    )}
                </div>

                <div className="alert alert-info py-2">
                    Approving this expense will post it to the ledger and reduce the Project's Petty Cash balance.
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button onClick={onExpenseReject} danger loading={expenseApprovalLoading}>Reject Expense</Button>
                    <Button type="primary" onClick={onExpenseApprove} loading={expenseApprovalLoading}>Approve & Post</Button>
                </div>
            </Modal>
        </main>
    );
};

export default PettyCashApprovalPage;
