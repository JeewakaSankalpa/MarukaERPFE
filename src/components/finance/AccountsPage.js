import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Badge, Tag, Row, Col, Statistic, Switch, Tooltip, Tabs } from 'antd';
import { PlusOutlined, BankOutlined, DollarOutlined, BookOutlined, SwapOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import api from '../../api/api';
import AccountLedgerModal from './AccountLedgerModal';

const { Option } = Select;

const AccountsPage = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const [ledgerVisible, setLedgerVisible] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Deposit modal state
    const [depositAccount, setDepositAccount] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositDesc, setDepositDesc] = useState('');
    const [depositLoading, setDepositLoading] = useState(false);

    // Transfer modal state
    const [transferVisible, setTransferVisible] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferForm] = Form.useForm();

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/accounts');
            setAccounts(res.data);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await api.patch(`/finance/accounts/${id}/toggle-active`);
            fetchAccounts();
        } catch (e) { console.error('Failed to toggle', e); }
    };

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) return;
        setDepositLoading(true);
        try {
            await api.post(`/finance/accounts/${depositAccount.id}/deposit`, {
                amount: Number(depositAmount),
                description: depositDesc || `Deposit to ${depositAccount.name}`
            });
            setDepositAccount(null);
            setDepositAmount('');
            setDepositDesc('');
            fetchAccounts();
        } catch (e) { console.error('Deposit failed', e); }
        setDepositLoading(false);
    };

    const handleViewLedger = (acc) => {
        setSelectedAccount(acc);
        setLedgerVisible(true);
    };

    const handleTransfer = async (values) => {
        if (values.fromAccountId === values.toAccountId) {
            return;
        }
        setTransferLoading(true);
        try {
            await api.post('/finance/accounts/transfer', {
                fromAccountId: values.fromAccountId,
                toAccountId: values.toAccountId,
                amount: values.amount,
                description: values.description || ''
            });
            setTransferVisible(false);
            transferForm.resetFields();
            fetchAccounts();
        } catch (e) {
            console.error('Transfer failed', e);
        } finally {
            setTransferLoading(false);
        }
    };

    const treeData = React.useMemo(() => {
        const accountMap = {};
        const rootNodes = [];

        accounts.forEach(acc => accountMap[acc.id] = { ...acc, children: [] });

        accounts.forEach(acc => {
            if (acc.parentAccountId && accountMap[acc.parentAccountId]) {
                accountMap[acc.parentAccountId].children.push(accountMap[acc.id]);
            } else {
                rootNodes.push(accountMap[acc.id]);
            }
        });

        // Remove empty 'children' to avoid confusing expand icons
        const clearEmptyChildren = (nodes) => {
            nodes.forEach(node => {
                if (node.children.length === 0) {
                    delete node.children;
                } else {
                    clearEmptyChildren(node.children);
                }
            });
        };
        clearEmptyChildren(rootNodes);

        return rootNodes;
    }, [accounts]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreate = async (values) => {
        try {
            await api.post('/finance/accounts', {
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
                <span style={{ fontWeight: record.hasSubAccounts ? 600 : 400 }}>
                    {record.projectId ? <Tag color="orange">Project</Tag> : null} {text}
                    {record.hasSubAccounts ? <Tag color="default" style={{ marginLeft: 8 }}>Parent</Tag> : null}
                </span>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            filters: [
                { text: 'Asset', value: 'ASSET' },
                { text: 'Liability', value: 'LIABILITY' },
                { text: 'Equity', value: 'EQUITY' },
                { text: 'Revenue', value: 'REVENUE' },
                { text: 'Expense', value: 'EXPENSE' },
            ],
            onFilter: (value, record) => record.type === value,
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
            title: 'Last Txn',
            dataIndex: 'lastTransactionDate',
            key: 'lastTransactionDate',
            sorter: (a, b) => {
                const dateA = a.lastTransactionDate ? new Date(a.lastTransactionDate).getTime() : 0;
                const dateB = b.lastTransactionDate ? new Date(b.lastTransactionDate).getTime() : 0;
                return dateA - dateB;
            },
            render: val => val ? new Date(val).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active, record) => (
                <Tooltip title={active ? 'Click to deactivate' : 'Click to activate'}>
                    <span
                        onClick={() => handleToggleActive(record.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <Badge status={active ? 'success' : 'default'} text={active ? 'Active' : 'Inactive'} />
                    </span>
                </Tooltip>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Tooltip title="View Ledger">
                        <Button size="small" icon={<BookOutlined />} onClick={() => handleViewLedger(record)}>Ledger</Button>
                    </Tooltip>
                    <Tooltip title="Deposit / Add Funds">
                        <Button size="small" type="primary" icon={<DollarOutlined />}
                            onClick={() => { setDepositAccount(record); setDepositAmount(''); setDepositDesc(''); }}
                        >Deposit</Button>
                    </Tooltip>
                    {record.hasSubAccounts && (
                        <Tooltip title="Add Sub-Account">
                            <Button size="small" icon={<PlusOutlined />} onClick={() => {
                                form.resetFields();
                                form.setFieldsValue({ parentAccountId: record.id, type: record.type, hasSubAccounts: false });
                                setIsModalVisible(true);
                            }} />
                        </Tooltip>
                    )}
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0" style={{ margin: 0 }}><BankOutlined /> Chart of Accounts</h2>
                        </div>
                <Button
                    icon={<SwapOutlined />}
                    onClick={() => { transferForm.resetFields(); setTransferVisible(true); }}
                    style={{ marginRight: 8 }}
                >
                    Transfer Between Accounts
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
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

            <Tabs 
                defaultActiveKey="1" 
                items={[
                    {
                        key: '1',
                        label: 'General Accounts',
                        children: (
                            <Table
                                dataSource={treeData.filter(a => !a.projectId)}
                                columns={columns}
                                rowKey="id"
                                loading={loading}
                                pagination={false}
                                expandable={{ defaultExpandAllRows: true }}
                            />
                        )
                    },
                    {
                        key: '2',
                        label: 'Project Accounts',
                        children: (
                            <Table
                                dataSource={treeData.filter(a => !!a.projectId)}
                                columns={columns}
                                rowKey="id"
                                loading={loading}
                                pagination={false}
                                expandable={{ defaultExpandAllRows: true }}
                            />
                        )
                    }
                ]} 
            />

            <Modal
                title="Create New Account"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ balance: 0, hasSubAccounts: false, currency: 'LKR' }}>
                    <Form.Item name="parentAccountId" label="Parent Account (Optional)">
                        <Select allowClear placeholder="Select a parent account..." disabled={Form.useWatch('hasSubAccounts', form)}>
                            {accounts.filter(a => a.hasSubAccounts).map(parent => (
                                <Option key={parent.id} value={parent.id}>{parent.code} - {parent.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="hasSubAccounts" valuePropName="checked" tooltip="Check this if you plan to create sub-accounts under this account.">
                        <Switch checkedChildren="Is Parent" unCheckedChildren="Standalone" disabled={!!Form.useWatch('parentAccountId', form)} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="Account Code" rules={[{ required: true }]}>
                                <Input placeholder="e.g. 1000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
                                <Input placeholder="e.g. Cash in Hand" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="Account Type" rules={[{ required: true }]} dependencies={['parentAccountId']}>
                                <Select disabled={!!Form.useWatch('parentAccountId', form)}>
                                    <Option value="ASSET">Asset</Option>
                                    <Option value="LIABILITY">Liability</Option>
                                    <Option value="EQUITY">Equity</Option>
                                    <Option value="REVENUE">Revenue</Option>
                                    <Option value="EXPENSE">Expense</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="currency" label="Currency">
                                <Select>
                                    <Option value="LKR">LKR</Option>
                                    <Option value="USD">USD</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>


                    <Form.Item name="balance" label="Opening Balance" dependencies={['hasSubAccounts']}>
                        <Input type="number" step="0.01" disabled={Form.useWatch('hasSubAccounts', form)} title={Form.useWatch('hasSubAccounts', form) ? "Parent accounts aggregate balances automatically" : ''} />
                    </Form.Item>

                    <Form.Item noStyle dependencies={['hasSubAccounts']}>
                        {() => {
                            if (form.getFieldValue('hasSubAccounts')) {
                                return (
                                    <Card title="Initial Sub-Accounts (Optional)" size="small" style={{ marginTop: 16 }}>
                                        <Form.List name="initialSubAccounts">
                                            {(fields, { add, remove }) => (
                                                <>
                                                    {fields.map(({ key, name, ...restField }) => (
                                                        <Row gutter={8} key={key} style={{ marginBottom: 8, alignItems: 'center' }}>
                                                            <Col span={6}>
                                                                <Form.Item {...restField} name={[name, 'code']} rules={[{ required: true, message: 'Code required' }]} style={{ marginBottom: 0 }}>
                                                                    <Input placeholder="Sub Code" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={10}>
                                                                <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Name required' }]} style={{ marginBottom: 0 }}>
                                                                    <Input placeholder="Sub Name" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={6}>
                                                                <Form.Item {...restField} name={[name, 'balance']} style={{ marginBottom: 0 }} initialValue={0}>
                                                                    <Input type="number" step="0.01" placeholder="Opening Bal" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={2}>
                                                                <Button type="text" danger icon={<PlusOutlined style={{ transform: 'rotate(45deg)' }} />} onClick={() => remove(name)} />
                                                            </Col>
                                                        </Row>
                                                    ))}
                                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                        Add Sub-Account
                                                    </Button>
                                                </>
                                            )}
                                        </Form.List>
                                    </Card>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>
                </Form>
            </Modal>

            <AccountLedgerModal
                account={selectedAccount}
                open={ledgerVisible}
                onCancel={() => setLedgerVisible(false)}
                onViewSubAccount={(acc) => handleViewLedger(acc)}
            />

            {/* Deposit Modal */}
            <Modal
                title={`💰 Deposit / Add Funds — ${depositAccount?.name}`}
                open={!!depositAccount}
                onCancel={() => setDepositAccount(null)}
                onOk={handleDeposit}
                okText={depositLoading ? 'Processing...' : 'Confirm Deposit'}
                okButtonProps={{ disabled: depositLoading }}
            >
                <Form layout="vertical">
                    <Form.Item label="Amount to Deposit (Rs.)" required>
                        <Input
                            type="number"
                            min={0}
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            placeholder="e.g. 100000"
                        />
                    </Form.Item>
                    <Form.Item label="Description / Reason (optional)">
                        <Input
                            value={depositDesc}
                            onChange={e => setDepositDesc(e.target.value)}
                            placeholder="e.g. Monthly cash top-up"
                        />
                    </Form.Item>
                    <p className="text-muted small">
                        This will create a balanced Journal Entry: Debit <strong>{depositAccount?.name}</strong> / Credit <strong>Capital Injection</strong>.
                    </p>
                </Form>
            </Modal>

            {/* Transfer Between Accounts Modal */}
            <Modal
                title={<span><SwapOutlined /> Transfer Between Accounts</span>}
                open={transferVisible}
                onCancel={() => setTransferVisible(false)}
                onOk={() => transferForm.submit()}
                okText={transferLoading ? 'Processing...' : 'Confirm Transfer'}
                confirmLoading={transferLoading}
                width={520}
            >
                <p style={{ color: '#888', marginBottom: 16 }}>
                    Move funds between any two accounts. A balanced Journal Entry (Dr → To, Cr → From) will be posted automatically.
                </p>
                <Form form={transferForm} layout="vertical" onFinish={handleTransfer}>
                    <Form.Item name="fromAccountId" label="Transfer From" rules={[{ required: true, message: 'Please select source account' }]}>
                        <Select
                            showSearch
                            optionFilterProp="children"
                            placeholder="-- Select source account --"
                        >
                            {accounts.filter(a => !a.hasSubAccounts && a.isActive).map(acc => (
                                <Option key={acc.id} value={acc.id}>
                                    [{acc.code}] {acc.name} — Bal: {parseFloat(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="toAccountId" label="Transfer To" rules={[{ required: true, message: 'Please select destination account' }, ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value || getFieldValue('fromAccountId') !== value) return Promise.resolve();
                            return Promise.reject(new Error('Source and destination accounts must be different!'));
                        }
                    })]}
                    >
                        <Select
                            showSearch
                            optionFilterProp="children"
                            placeholder="-- Select destination account --"
                        >
                            {accounts.filter(a => !a.hasSubAccounts && a.isActive).map(acc => (
                                <Option key={acc.id} value={acc.id}>
                                    [{acc.code}] {acc.name} — Bal: {parseFloat(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="amount" label="Amount (Rs.)" rules={[{ required: true, message: 'Please enter an amount' }, { type: 'number', min: 0.01, message: 'Amount must be greater than zero' }]}>
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0.01}
                            step={0.01}
                            precision={2}
                            placeholder="e.g. 50000.00"
                            formatter={val => `Rs. ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={val => val.replace(/Rs\s?|,/g, '')}
                        />
                    </Form.Item>
                    <Form.Item name="description" label="Description / Purpose (optional)">
                        <Input placeholder="e.g. Move petty cash to HNB, Daily cash deposit" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AccountsPage;
