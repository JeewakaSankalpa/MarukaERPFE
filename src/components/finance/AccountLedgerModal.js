import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, message, Statistic, Card, Row, Col, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import api from '../../api/api';

const AccountLedgerModal = ({ account, open, onCancel, onViewSubAccount }) => {
    const [transactions, setTransactions] = useState([]);
    const [subAccounts, setSubAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ debit: 0, credit: 0, balance: 0 });

    const fetchData = useCallback(async () => {
        if (!account) return;
        setLoading(true);
        try {
            if (account.hasSubAccounts) {
                const res = await api.get(`/finance/accounts/${account.id}/subaccounts`);
                setSubAccounts(res.data || []);
            } else {
                const res = await api.get(`/finance/reports/accounts/${account.id}/ledger`);
                const data = res.data || [];

                if (data.length > 0) {
                    const totalDebit = data.reduce((sum, row) => sum + row.debit, 0);
                    const totalCredit = data.reduce((sum, row) => sum + row.credit, 0);
                    const closingBalance = data[data.length - 1].runningBalance;
                    setSummary({ debit: totalDebit, credit: totalCredit, balance: closingBalance });
                } else {
                    setSummary({ debit: 0, credit: 0, balance: 0 });
                }

                // Show latest first
                setTransactions([...data].reverse());
            }
        } catch (e) {
            message.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [account]);

    useEffect(() => {
        if (open && account) {
            fetchData();
        }
    }, [open, account, fetchData]);

    const columns = [
        { title: 'Date', dataIndex: 'date' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Reference', dataIndex: 'reference' },
        { title: 'Debit', dataIndex: 'debit', render: v => v > 0 ? v.toFixed(2) : '-' },
        { title: 'Credit', dataIndex: 'credit', render: v => v > 0 ? v.toFixed(2) : '-' },
        { title: 'Balance', dataIndex: 'runningBalance', render: v => <strong style={{ color: v < 0 ? 'red' : 'green' }}>{v.toFixed(2)}</strong> },
        { 
            title: 'Doc', 
            dataIndex: 'receiptUrl', 
            render: v => v ? <Button size="small" type="link" onClick={() => window.open(v, '_blank')}>View</Button> : null 
        }
    ];

    const subAccountColumns = [
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Sub-Account Name', dataIndex: 'name', key: 'name' },
        { 
            title: 'Current Balance', 
            dataIndex: 'balance', 
            key: 'balance',
            render: v => <strong style={{ color: '#0d6efd' }}>{(v || 0).toLocaleString('en-US', { style: 'currency', currency: account?.currency || 'LKR' })}</strong>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button size="small" type="primary" onClick={() => onViewSubAccount(record)}>View Ledger</Button>
            )
        }
    ];

    return (
        <Modal
            title={account?.hasSubAccounts ? `${account?.name} - Sub-Accounts Summary` : `${account?.name} - Ledger`}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={1000}
        >
            {account?.hasSubAccounts ? (
                <>
                    <Card style={{ marginBottom: 16 }} size="small">
                        <Statistic title="Aggregate Parent Balance" value={account.balance} precision={2} valueStyle={{ color: '#0d6efd' }} />
                    </Card>
                    <Table
                        dataSource={subAccounts}
                        columns={subAccountColumns}
                        rowKey="id"
                        loading={loading}
                        size="small"
                        pagination={false}
                    />
                </>
            ) : (
                <>
                    <div className="mb-3">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic title="Total Debit" value={summary.debit} prefix={<ArrowUpOutlined />} valueStyle={{ color: 'green' }} precision={2} />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic title="Total Credit" value={summary.credit} prefix={<ArrowDownOutlined />} valueStyle={{ color: 'red' }} precision={2} />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic title="Current Balance" value={summary.balance} precision={2} />
                                </Card>
                            </Col>
                        </Row>
                    </div>
                    <Table
                        dataSource={transactions}
                        columns={columns}
                        rowKey={(r) => r.date + r.description + r.runningBalance}
                        loading={loading}
                        size="small"
                        pagination={{ pageSize: 20 }}
                    />
                </>
            )}
        </Modal>
    );
};

export default AccountLedgerModal;
