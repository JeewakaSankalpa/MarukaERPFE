import React, { useState, useEffect } from 'react';
import { Modal, Table, message, Spin, Statistic, Card, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import api from '../../api/api';

const AccountLedgerModal = ({ accountId, open, onCancel }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ debit: 0, credit: 0, balance: 0 });

    useEffect(() => {
        if (open && accountId) {
            fetchLedger();
        }
    }, [open, accountId]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/accounts/${accountId}/ledger`);
            setTransactions(res.data || []);

            // Calc summary from response (last row has current running balance)
            if (res.data && res.data.length > 0) {
                const totalDebit = res.data.reduce((sum, row) => sum + row.debit, 0);
                const totalCredit = res.data.reduce((sum, row) => sum + row.credit, 0);
                const closingBalance = res.data[res.data.length - 1].runningBalance;

                setSummary({ debit: totalDebit, credit: totalCredit, balance: closingBalance });
            } else {
                setSummary({ debit: 0, credit: 0, balance: 0 });
            }
        } catch (e) {
            message.error("Failed to load ledger");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'date', render: d => d }, // Backend sends yyyy-MM-dd
        { title: 'Description', dataIndex: 'description' },
        { title: 'Reference', dataIndex: 'reference' },
        { title: 'Debit', dataIndex: 'debit', render: v => v > 0 ? v.toFixed(2) : '-' },
        { title: 'Credit', dataIndex: 'credit', render: v => v > 0 ? v.toFixed(2) : '-' },
        { title: 'Balance', dataIndex: 'runningBalance', render: v => <strong style={{ color: v < 0 ? 'red' : 'green' }}>{v.toFixed(2)}</strong> }
    ];

    return (
        <Modal
            title="Account Ledger"
            open={open}
            onCancel={onCancel}
            footer={null}
            width={1000}
        >
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
                rowKey={(r) => r.date + r.description + r.runningBalance} // composite key as no ID returned
                loading={loading}
                size="small"
                pagination={{ pageSize: 20 }}
            />
        </Modal>
    );
};

export default AccountLedgerModal;
