import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Modal, Form, Select, Input, Tag, Space, Spin, Card } from 'antd';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const PettyCashApprovalPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);

    // Approval Modal
    const [approvalVisible, setApprovalVisible] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchRequests();
        fetchAccounts();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/project-accounts/petty-cash/requests');
            setRequests(res.data || []);
        } catch (e) {
            console.error("Petty cash fetch error:", e);
            if (e.response && e.response.status !== 404) {
                toast.error("Failed to load petty cash requests");
            }
        } finally {
            setLoading(false);
        }
    };

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
            fetchRequests();
        } catch (e) {
            console.error(e);
            toast.error(e.response?.data || "Failed to approve request");
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
            await api.post(`/project-accounts/petty-cash/requests/${currentRequest.id}/approve`, payload);
            toast.success("Request rejected");
            setApprovalVisible(false);
            fetchRequests();
        } catch (e) {
            toast.error("Failed to reject request");
        } finally {
            setApprovalLoading(false);
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

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} className="me-2" />
                <h3 className="mb-0">Petty Cash Approvals</h3>
            </div>

            <Card className="shadow-sm">
                <Table 
                    dataSource={requests} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title="Review Petty Cash Request"
                open={approvalVisible}
                onCancel={() => setApprovalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <div className="mb-3">
                    <p><strong>Description:</strong> {currentRequest?.description}</p>
                    <p><strong>Requested Amount:</strong> LKR {currentRequest?.amount.toLocaleString()}</p>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Group className="mb-3">
                    <Form.Item name="accountId" label="Source Account (Cash/Bank)" rules={[{ required: true }]}>
                        <Select placeholder="Select from where to pay">
                            {accounts.map(a => <Select.Option key={a.id} value={a.id}>{a.name} (Bal: {a.balance})</Select.Option>)}
                        </Select>
                    </Form.Item>
                    </Form.Group>

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
        </Container>
    );
};

export default PettyCashApprovalPage;
