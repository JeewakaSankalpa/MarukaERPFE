import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Table, message, Button, Empty } from 'antd';
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
        { title: 'Date', dataIndex: 'date', width: 120 },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Reference', dataIndex: 'reference' },
        { title: 'Debit', dataIndex: 'debit', align: 'right', render: v => <span className="accounts-ledger-money">{v > 0 ? formatMoney(v) : '—'}</span> },
        { title: 'Credit', dataIndex: 'credit', align: 'right', render: v => <span className="accounts-ledger-money">{v > 0 ? formatMoney(v) : '—'}</span> },
        { title: 'Balance', dataIndex: 'runningBalance', align: 'right', render: v => <strong className={`accounts-ledger-money ${v < 0 ? 'negative' : ''}`}>{formatMoney(v)}</strong> },
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
            align: 'right',
            render: v => <strong className={`accounts-ledger-money ${Number(v) < 0 ? 'negative' : ''}`}>{formatMoney(v)}</strong>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button size="small" type="primary" onClick={() => onViewSubAccount(record)}>View Ledger</Button>
            )
        }
    ];

    const formatMoney = (value) => Number(value || 0).toLocaleString('en-LK', {
        style: 'currency', currency: account?.currency || 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2
    });

    return (
        <Modal
            rootClassName="accounts-ledger-modal"
            title={<div className="accounts-modal-title"><span>{account?.code} · {account?.currency || 'LKR'}</span><strong>{account?.name} · {account?.hasSubAccounts ? 'Sub-account summary' : 'Transaction ledger'}</strong></div>}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={1080}
        >
            {account?.hasSubAccounts ? (
                <>
                    <div className="accounts-ledger-summary"><div className="accounts-ledger-stat"><span>Aggregate parent balance</span><strong>{formatMoney(account.balance)}</strong></div><div className="accounts-ledger-stat"><span>Sub-accounts</span><strong>{subAccounts.length}</strong></div></div>
                    <div className="accounts-ledger-scroll" tabIndex="0" aria-label="Sub-accounts table. Scroll horizontally for more columns."><Table
                        dataSource={subAccounts}
                        columns={subAccountColumns}
                        rowKey="id"
                        loading={loading}
                        size="small"
                        pagination={false}
                        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sub-accounts available" /> }}
                    /></div>
                </>
            ) : (
                <>
                    <div className="accounts-ledger-summary"><div className="accounts-ledger-stat debit"><span>Total debit</span><strong>{formatMoney(summary.debit)}</strong></div><div className="accounts-ledger-stat credit"><span>Total credit</span><strong>{formatMoney(summary.credit)}</strong></div><div className="accounts-ledger-stat"><span>Current balance</span><strong className={summary.balance < 0 ? 'negative' : ''}>{formatMoney(summary.balance)}</strong></div></div>
                    <div className="accounts-ledger-scroll" tabIndex="0" aria-label="Transaction history table. Scroll horizontally for more columns."><Table
                        dataSource={transactions}
                        columns={columns}
                        rowKey={(r) => r.date + r.description + r.runningBalance}
                        loading={loading}
                        size="small"
                        pagination={{ pageSize: 20 }}
                        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions recorded for this account" /> }}
                    /></div>
                </>
            )}
        </Modal>
    );
};

export default AccountLedgerModal;
