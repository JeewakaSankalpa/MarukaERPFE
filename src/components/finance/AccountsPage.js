import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Badge, Tag, Row, Col, Statistic } from 'antd';
import { PlusOutlined, BankOutlined, DollarOutlined, BookOutlined } from '@ant-design/icons';
import axios from 'axios';
import AccountLedgerModal from './AccountLedgerModal';

const { Option } = Select;

const AccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // Ledger Modal State
    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState(null);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8080/api/finance/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreate = async (values) => {
        try {
            await axios.post('http://localhost:8080/api/finance/accounts', {
                ...values,
                // balance passed from form
                isActive: true
            });
            setIsModalVisible(false);
            form.resetFields();
            fetchAccounts();
        } catch (error) {
            console.error("Failed to create account", error);
        }
    };

    const handleViewLedger = (accId) => {
        setSelectedAccountId(accId);
        setLedgerVisible(true);
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: text => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <span>
                    {record.projectId ? <Tag color="orange">Project</Tag> : null} {text}
                </span>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: type => {
                let color = 'default';
                if (type === 'ASSET') color = 'green';
                if (type === 'LIABILITY') color = 'red';
                if (type === 'EQUITY') color = 'purple';
                if (type === 'REVENUE') color = 'cyan';
                if (type === 'EXPENSE') color = 'volcano';
                return <Tag color={color}>{type}</Tag>;
            }
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            render: (val, record) => {
                const amount = parseFloat(val).toLocaleString('en-US', { style: 'currency', currency: record.currency || 'LKR' });
                return <span style={{ fontWeight: 'bold' }}>{amount}</span>;
            }
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: active => active ? <Badge status="success" text="Active" /> : <Badge status="default" text="Inactive" />
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button size="small" icon={<BookOutlined />} onClick={() => handleViewLedger(record.id)}>Ledger</Button>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}><BankOutlined /> Chart of Accounts</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                    New Account
                </Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Total Assets"
                            value={accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + (a.balance || 0), 0)}
                            precision={2}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card bordered={false}>
                        <Statistic
                            title="Total Liabilities"
                            value={accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + (a.balance || 0), 0)}
                            precision={2}
                            valueStyle={{ color: '#cf1322' }}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Table
                dataSource={accounts}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
            />

            <Modal
                title="Create New Account"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="code" label="Account Code" rules={[{ required: true }]}>
                        <Input placeholder="e.g. 1000" />
                    </Form.Item>
                    <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Cash in Hand" />
                    </Form.Item>
                    <Form.Item name="balance" label="Opening Balance" initialValue={0}>
                        <Input type="number" step="0.01" />
                    </Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select>
                            <Option value="ASSET">Asset</Option>
                            <Option value="LIABILITY">Liability</Option>
                            <Option value="EQUITY">Equity</Option>
                            <Option value="REVENUE">Revenue</Option>
                            <Option value="EXPENSE">Expense</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="currency" label="Currency" initialValue="LKR">
                        <Select>
                            <Option value="LKR">LKR</Option>
                            <Option value="USD">USD</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <AccountLedgerModal
                accountId={selectedAccountId}
                open={ledgerVisible}
                onCancel={() => setLedgerVisible(false)}
            />
        </div>
    );
};

export default AccountsPage;
