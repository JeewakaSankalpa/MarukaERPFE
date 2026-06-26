import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Button, Modal, Form, Input, Select, InputNumber, Space, message } from 'antd';
import api from '../../api/api';
import dayjs from 'dayjs';

const JournalEntryList = () => {
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(dayjs());
    const [showCreate, setShowCreate] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchJournals();
    }, [month]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            setAccounts((res.data || []).filter(a => a.isActive !== false && !a.hasSubAccounts));
        } catch (e) {
            console.error("Failed to load accounts", e);
        }
    };

    const fetchJournals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/journals?page=0&size=500');
            const sorted = (res.data.content || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted);
        } catch (e) {
            console.error("Failed to load journals", e);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        form.setFieldsValue({
            date: dayjs(),
            reference: '',
            description: '',
            lines: [
                { debit: 0, credit: 0 },
                { debit: 0, credit: 0 }
            ]
        });
        setShowCreate(true);
    };

    const handleCreateJournal = async () => {
        try {
            const values = await form.validateFields();
            const lines = (values.lines || []).map(line => {
                const account = accounts.find(a => a.id === line.accountId);
                return {
                    accountId: line.accountId,
                    accountName: account?.name,
                    description: line.description || '',
                    debit: Number(line.debit || 0),
                    credit: Number(line.credit || 0)
                };
            });

            const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
            const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
            const invalidLine = lines.some(line => !line.accountId || (line.debit <= 0 && line.credit <= 0) || (line.debit > 0 && line.credit > 0));

            if (invalidLine) {
                message.error("Each line needs an account and either a debit or a credit, not both.");
                return;
            }
            if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
                message.error("Journal must balance: total debits must equal total credits.");
                return;
            }

            await api.post('/finance/journals', {
                date: values.date.format('YYYY-MM-DD'),
                reference: values.reference,
                description: values.description,
                lines
            });

            message.success("Journal entry posted");
            setShowCreate(false);
            fetchJournals();
            fetchAccounts();
        } catch (e) {
            if (e?.errorFields) return;
            message.error(e?.response?.data?.message || "Failed to post journal entry");
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'date', render: d => new Date(d).toLocaleDateString() },
        { title: 'Reference', dataIndex: 'reference' },
        { title: 'Description', dataIndex: 'description' },
        { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'POSTED' ? 'green' : 'orange'}>{s}</Tag> },
        { title: 'Debit', render: (_, r) => r.lines.reduce((acc, l) => acc + (l.debit || 0), 0).toFixed(2) },
        { title: 'Credit', render: (_, r) => r.lines.reduce((acc, l) => acc + (l.credit || 0), 0).toFixed(2) },
        { 
            title: 'Doc', 
            dataIndex: 'receiptUrl', 
            render: (url, record) => {
              const fileUrl = url || record.lines.find(l => l.receiptUrl)?.receiptUrl;
              return fileUrl ? <Button size="small" type="link" onClick={() => window.open(fileUrl, '_blank')}>View</Button> : null;
            }
        }
    ];

    const expandedRowRender = (record) => {
        const lineCols = [
            { title: 'Account', dataIndex: 'accountName' },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Debit', dataIndex: 'debit', render: v => v ? v.toFixed(2) : '' },
            { title: 'Credit', dataIndex: 'credit', render: v => v ? v.toFixed(2) : '' },
            { 
              title: 'Doc', 
              dataIndex: 'receiptUrl', 
              render: v => v ? <Button size="small" type="link" onClick={() => window.open(v, '_blank')}>File</Button> : null 
            }
        ];
        return <Table columns={lineCols} dataSource={record.lines} pagination={false} size="small" rowKey="accountId" />;
    };

    return (
        <Card title="Journal Entries Ledger">
            <div className="mb-3 d-flex gap-2 justify-content-between">
                <Space>
                <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
                <Button onClick={fetchJournals}>Refresh</Button>
                </Space>
                <Button type="primary" onClick={openCreateModal}>New Journal Entry</Button>
            </div>
            <Table
                dataSource={entries}
                columns={columns}
                rowKey="id"
                loading={loading}
                expandable={{ expandedRowRender }}
            />
            <Modal
                title="New Journal Entry"
                open={showCreate}
                onCancel={() => setShowCreate(false)}
                onOk={handleCreateJournal}
                okText="Post Journal"
                width={900}
            >
                <Form form={form} layout="vertical">
                    <Space align="start" size="middle" style={{ width: '100%' }}>
                        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                            <DatePicker />
                        </Form.Item>
                        <Form.Item name="reference" label="Reference" rules={[{ required: true }]}>
                            <Input placeholder="OPENING-STOCK-CLEANUP" />
                        </Form.Item>
                    </Space>
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input placeholder="Reclass opening stock GRN from AP to Opening Balance Equity" />
                    </Form.Item>
                    <Form.List name="lines">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                                        <Form.Item {...restField} name={[name, 'accountId']} rules={[{ required: true, message: 'Account required' }]}>
                                            <Select
                                                showSearch
                                                placeholder="Account"
                                                style={{ width: 260 }}
                                                optionFilterProp="label"
                                                options={accounts.map(a => ({
                                                    value: a.id,
                                                    label: `${a.code || ''} ${a.name} (${a.type})`
                                                }))}
                                            />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'description']}>
                                            <Input placeholder="Line description" style={{ width: 240 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'debit']}>
                                            <InputNumber min={0} precision={2} placeholder="Debit" style={{ width: 130 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'credit']}>
                                            <InputNumber min={0} precision={2} placeholder="Credit" style={{ width: 130 }} />
                                        </Form.Item>
                                        {fields.length > 2 && <Button danger onClick={() => remove(name)}>Remove</Button>}
                                    </Space>
                                ))}
                                <Button onClick={() => add({ debit: 0, credit: 0 })}>Add Line</Button>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </Card>
    );
};

export default JournalEntryList;
