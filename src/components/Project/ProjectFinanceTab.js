import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Table, Badge, Spin } from 'antd';
import { DollarOutlined, BankOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api/api';
import PettyCashAllocation from './PettyCashAllocation';

const ProjectFinanceTab = ({ projectId }) => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [allocationVisible, setAllocationVisible] = useState(false);

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

    useEffect(() => {
        if (projectId) fetchAccount();
    }, [projectId]);

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
                                prefix="$"
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Received"
                                value={account.paidAmount}
                                precision={2}
                                prefix="$"
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
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                className="mt-2"
                                onClick={() => setAllocationVisible(true)}
                            >
                                Allocate Funds
                            </Button>
                        </Card>
                    </Col>
                </Row>
            )}

            <PettyCashAllocation
                projectId={projectId}
                visible={allocationVisible}
                onClose={() => setAllocationVisible(false)}
                onSuccess={fetchAccount}
            />

            <Card className="mt-4" title="Petty Cash History">
                <TransactionHistory projectId={projectId} />
            </Card>
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
                // Fetch events/transactions
                const eventsRes = await api.get(`/project-accounts/${projectId}/events`);
                setTransactions(eventsRes.data.content || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [projectId]);

    const columns = [
        { title: 'Date', dataIndex: 'at', render: d => new Date(d).toLocaleDateString() },
        { title: 'Type', dataIndex: 'type' },
        {
            title: 'Amount Change', dataIndex: 'amountChange',
            render: (val) => <span style={{ color: val < 0 ? 'red' : 'green', fontWeight: 'bold' }}>{val}</span>
        },
        { title: 'Details', dataIndex: 'details' },
        { title: 'Actor', dataIndex: 'actor' }
    ];

    return <Table dataSource={transactions} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />;
};

export default ProjectFinanceTab;
