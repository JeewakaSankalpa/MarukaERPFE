import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Tabs } from 'antd';
import api from '../../api/api';

const ProjectFinancialReport = ({ projectId, currency = 'LKR' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchReport();
        }
    }, [projectId]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/finance/reports/project/${projectId}`);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spin />;
    if (!data) return <div>No data available</div>;

    const chartData = [
        { type: 'Materials', value: Math.abs(data.costOfMaterials || 0) },
        { type: 'Other Expenses', value: Math.abs(data.otherExpenses || 0) },
    ];

    // Config for Pie Chart
    const pieConfig = {
        appendPadding: 10,
        data: chartData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.9,
        label: {
            type: 'inner',
            offset: '-30%',
            content: ({ percent }) => `${(percent * 100).toFixed(0)}%`,
            style: {
                fontSize: 14,
                textAlign: 'center',
            },
        },
        interactions: [{ type: 'element-active' }],
    };
    return (
        <div className="p-2">
            <Row gutter={16}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Income (Revenue)"
                            value={data.totalIncome}
                            precision={2}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={currency}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Expenses"
                            value={data.totalExpenses}
                            precision={2}
                            valueStyle={{ color: '#cf1322' }}
                            prefix={currency}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Net Profit / (Loss)"
                            value={data.netProfit}
                            precision={2}
                            valueStyle={{ color: data.netProfit >= 0 ? '#3f8600' : '#cf1322' }}
                            prefix={currency}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} className="mt-4">
                <Col span={24}>
                    <Card title="Detailed Metrics">
                        <Table
                            pagination={false}
                            dataSource={[
                                { key: '1', metric: 'Material Costs (COGS)', value: data.costOfMaterials },
                                { key: '2', metric: 'Other Expenses', value: data.otherExpenses },
                                { key: '3', metric: 'Gross Margin', value: data.totalIncome - data.costOfMaterials, isBold: true },
                            ]}
                            columns={[
                                { title: 'Metric', dataIndex: 'metric', render: (t, r) => r.isBold ? <strong>{t}</strong> : t },
                                { title: 'Value', dataIndex: 'value', render: (v, r) => r.isBold ? <strong>{parseFloat(v).toFixed(2)}</strong> : parseFloat(v).toFixed(2) }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProjectFinancialReport;
