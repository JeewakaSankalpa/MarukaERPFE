import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Select, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import api from '../../api/api';

const { Option } = Select;

const PettyCashApprovalPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);

    // Approval Modal
    const [approvalVisible, setApprovalVisible] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('/project-accounts/petty-cash/requests');
            setRequests(res.data || []);
        } catch (e) {
            message.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            // Filter Asset/Cash/Bank accounts
            setAccounts(res.data.filter(a => a.type === 'ASSET' && (a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank'))));
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchRequests();
        fetchAccounts();
    }, []);

    const openApprovalModal = (req) => {
        setCurrentRequest(req);
        setApprovalVisible(true);
    };

    const handleApprove = async (values) => {
        if (!currentRequest) return;
        setApprovalLoading(true);
        try {
            await api.post(`/project-accounts/petty-cash/requests/${currentRequest.id}/approve`, {
                amount: currentRequest.amount,
                sourceAccountId: values.sourceAccountId
            });
            message.success("Request Approved");
            setApprovalVisible(false);
            form.resetFields();
            fetchRequests();
        } catch (e) {
            message.error("Approval Failed");
        } finally {
            setApprovalLoading(false);
        }
    };

    const handleReject = async (id) => {
        try {
            await api.post(`/project-accounts/petty-cash/requests/${id}/reject`);
            message.warning("Request Rejected");
            fetchRequests();
        } catch (e) {
            message.error("Rejection Failed");
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'createdAt', render: d => new Date(d).toLocaleDateString() },
        { title: 'Project', dataIndex: 'projectName' },
        { title: 'Requested By', dataIndex: 'requestedBy' },
        { title: 'Amount', dataIndex: 'amount', render: v => <strong>{v}</strong> },
        { title: 'Reason', dataIndex: 'reason' },
        { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'PENDING' ? 'orange' : 'green'}>{s}</Tag> },
        {
            title: 'Actions',
            render: (_, record) => (
                <div className="d-flex gap-2">
                    <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => openApprovalModal(record)}>Approve</Button>
                    <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleReject(record.id)}>Reject</Button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4">
            <h2>Petty Cash Approvals</h2>
            <Table
                dataSource={requests}
                columns={columns}
                rowKey="id"
                loading={loading}
                className="mt-3"
            />

            <Modal
                title="Approve Fund Allocation"
                open={approvalVisible}
                onCancel={() => setApprovalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={approvalLoading}
            >
                <div className="mb-3">
                    <p>Allocating <strong>{currentRequest?.amount}</strong> to project <strong>{currentRequest?.projectName}</strong>.</p>
                </div>
                <Form form={form} layout="vertical" onFinish={handleApprove}>
                    <Form.Item name="sourceAccountId" label="Source Account (Bank/Cash)" rules={[{ required: true }]}>
                        <Select placeholder="Select source of funds">
                            {accounts.map(acc => (
                                <Option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.code}) - Bal: {acc.balance}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PettyCashApprovalPage;
