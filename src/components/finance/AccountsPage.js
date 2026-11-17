import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Badge, Tag, Row, Col, Switch, Tooltip, Tabs, Empty } from 'antd';
import { PlusOutlined, DollarOutlined, BookOutlined, SwapOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import api from '../../api/api';
import AccountLedgerModal from './AccountLedgerModal';
import './AccountsPage.css';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

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

    const visibleTreeData = React.useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const matches = (account) => {
            const matchesQuery = !query || [account.code, account.name, account.type, account.currency]
                .some(value => String(value || '').toLowerCase().includes(query));
            const matchesType = typeFilter === 'ALL' || account.type === typeFilter;
            const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? account.isActive : !account.isActive);
            return matchesQuery && matchesType && matchesStatus;
        };
        const filterBranch = (account) => {
            const children = (account.children || []).map(filterBranch).filter(Boolean);
            if (!matches(account) && children.length === 0) return null;
            return children.length > 0 ? { ...account, children } : { ...account, children: undefined };
        };
        return treeData.map(filterBranch).filter(Boolean);
    }, [treeData, searchTerm, typeFilter, statusFilter]);

    const totals = React.useMemo(() => ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].reduce((result, type) => ({
        ...result,
        [type]: accounts.filter(account => account.type === type)
            .reduce((sum, account) => sum + Number(account.balance || 0), 0)
    }), {}), [accounts]);

    const formatMoney = (value, currency = 'LKR') => Number(value || 0).toLocaleString('en-LK', {
        style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
    });

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
            width: 112,
            render: text => <span className="accounts-code">{text}</span>
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="accounts-name-cell">
                    <strong>{text}</strong>
                    <span>{record.projectId ? 'Project account' : record.hasSubAccounts ? 'Parent account' : 'Posting account'}</span>
                </div>
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
                return <Tag color={color} className="accounts-type-tag">{type}</Tag>;
            }
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            render: (val, record) => {
                return <span className={`accounts-balance ${Number(val) < 0 ? 'is-negative' : ''}`}>{formatMoney(val, record.currency || 'LKR')}</span>;
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
            width: 150,
            render: val => <span className="accounts-last-transaction">{val ? new Date(val).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No activity'}</span>
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active, record) => (
                <Tooltip title={active ? 'Deactivate account' : 'Activate account'}>
                    <button type="button" className="accounts-status-button" onClick={() => handleToggleActive(record.id)} aria-label={`${active ? 'Deactivate' : 'Activate'} ${record.name}`}>
                        <Badge status={active ? 'success' : 'default'} text={active ? 'Active' : 'Inactive'} />
                    </button>
                </Tooltip>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div className="accounts-row-actions">
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
                            <Button size="small" aria-label={`Add sub-account under ${record.name}`} icon={<PlusOutlined />} onClick={() => {
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

    const renderAccountTable = (projectAccounts) => {
        const data = visibleTreeData.filter(account => projectAccounts ? !!account.projectId : !account.projectId);
        return <div className="accounts-table-scroll" tabIndex="0" aria-label={`${projectAccounts ? 'Project' : 'General'} accounts table. Scroll horizontally for more columns.`}>
            <Table
                key={`${projectAccounts ? 'project' : 'general'}-${searchTerm}-${typeFilter}-${statusFilter}`}
                className="accounts-table"
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={false}
                expandable={{ defaultExpandAllRows: true }}
                scroll={{ x: 1120 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No accounts match these filters' : 'No accounts available'} /> }}
            />
        </div>;
    };

    return (
        <main className="accounts-page">
            <header className="accounts-header">
                <div className="accounts-heading-group">
                    <button type="button" className="accounts-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={18} /></button>
                    <div>
                        <span className="accounts-eyebrow">Sales &amp; Finance</span>
                        <h1>Chart of accounts</h1>
                        <p>Review balances, account activity, and the structure behind financial reporting.</p>
                    </div>
                </div>
                <div className="accounts-header-actions">
                    <Button icon={<SwapOutlined />} onClick={() => { transferForm.resetFields(); setTransferVisible(true); }}>Transfer funds</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsModalVisible(true); }}>New account</Button>
                </div>
            </header>

            <section className="accounts-summary-grid" aria-label="Account balance summary">
                {[
                    ['ASSET', 'Assets', 'Available and controlled resources'],
                    ['LIABILITY', 'Liabilities', 'Current financial obligations'],
                    ['EQUITY', 'Equity', 'Owner and retained value'],
                    ['REVENUE', 'Revenue', 'Recognised operating income'],
                    ['EXPENSE', 'Expenses', 'Recognised operating costs']
                ].map(([type, label, description]) => <article className={`accounts-summary accounts-summary-${type.toLowerCase()}`} key={type}>
                    <div className="accounts-summary-icon" aria-hidden="true">{type === 'ASSET' ? <WalletOutlined /> : <DollarOutlined />}</div>
                    <div><span>{label}</span><strong>{formatMoney(totals[type])}</strong><small>{description}</small></div>
                </article>)}
            </section>

            <section className="accounts-workspace" aria-labelledby="accounts-directory-heading">
                <div className="accounts-workspace-heading">
                    <div><h2 id="accounts-directory-heading">Account directory</h2><p>{accounts.length} accounts · {accounts.filter(account => account.isActive).length} active</p></div>
                </div>
                <div className="accounts-filters" role="search" aria-label="Filter accounts">
                    <Input aria-label="Search accounts" prefix={<SearchOutlined />} allowClear value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search by code, name, type, or currency" />
                    <Select aria-label="Filter by account type" value={typeFilter} onChange={setTypeFilter} options={['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(value => ({ value, label: value === 'ALL' ? 'All account types' : value.charAt(0) + value.slice(1).toLowerCase() }))} />
                    <Select aria-label="Filter by account status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'ALL', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
                </div>
                <Tabs className="accounts-tabs" defaultActiveKey="general" items={[
                    { key: 'general', label: `General accounts (${visibleTreeData.filter(account => !account.projectId).length})`, children: renderAccountTable(false) },
                    { key: 'project', label: `Project accounts (${visibleTreeData.filter(account => !!account.projectId).length})`, children: renderAccountTable(true) }
                ]} />
            </section>

            <Modal
                rootClassName="accounts-form-modal"
                title={<div className="accounts-modal-title"><span>Account structure</span><strong>Create new account</strong></div>}
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
                rootClassName="accounts-form-modal"
                title={<div className="accounts-modal-title"><span>Account funding</span><strong>Deposit to {depositAccount?.name}</strong></div>}
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
                rootClassName="accounts-form-modal"
                title={<div className="accounts-modal-title"><span>Internal movement</span><strong><SwapOutlined /> Transfer between accounts</strong></div>}
                open={transferVisible}
                onCancel={() => setTransferVisible(false)}
                onOk={() => transferForm.submit()}
                okText={transferLoading ? 'Processing...' : 'Confirm Transfer'}
                confirmLoading={transferLoading}
                width={520}
            >
                <p className="accounts-modal-description">
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
        </main>
    );
};

export default AccountsPage;
