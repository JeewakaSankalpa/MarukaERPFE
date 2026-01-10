import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Button, Row, Col } from 'antd';
import api from '../../api/api';
import dayjs from 'dayjs';

const JournalEntryList = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(dayjs());

    useEffect(() => {
        fetchJournals();
    }, [month]);

    const fetchJournals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/journals?page=0&size=100');
            setEntries(res.data.content || []);
        } catch (e) {
            console.error("Failed to load journals", e);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'date', render: d => new Date(d).toLocaleDateString() },
        { title: 'Reference', dataIndex: 'reference' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'POSTED' ? 'green' : 'orange'}>{s}</Tag> },
        { title: 'Debit', render: (_, r) => r.lines.reduce((acc, l) => acc + (l.debit || 0), 0).toFixed(2) },
        { title: 'Credit', render: (_, r) => r.lines.reduce((acc, l) => acc + (l.credit || 0), 0).toFixed(2) }
    ];

    const expandedRowRender = (record) => {
        const lineCols = [
            { title: 'Account', dataIndex: 'accountName' },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Debit', dataIndex: 'debit', render: v => v ? v.toFixed(2) : '' },
            { title: 'Credit', dataIndex: 'credit', render: v => v ? v.toFixed(2) : '' }
        ];
        return <Table columns={lineCols} dataSource={record.lines} pagination={false} size="small" rowKey="accountId" />;
    };

    return (
        <Card title="Journal Entries Ledger">
            <div className="mb-3 d-flex gap-2">
                <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
                <Button onClick={fetchJournals}>Refresh</Button>
            </div>
            <Table
                dataSource={entries}
                columns={columns}
                rowKey="id"
                loading={loading}
                expandable={{ expandedRowRender }}
            />
        </Card>
    );
};

export default JournalEntryList;
