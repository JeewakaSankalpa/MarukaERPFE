import React, { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Select, Table, Tag, message } from 'antd';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, BookOpen, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import dayjs from 'dayjs';
import './JournalEntryList.css';

const money = value => Number(value || 0).toLocaleString('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const JournalEntryList = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(dayjs());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [form] = Form.useForm();

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/finance/accounts');
            setAccounts((res.data || []).filter(account => account.isActive !== false && !account.hasSubAccounts));
        } catch (error) { console.error('Failed to load accounts', error); }
    };
    const fetchJournals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/journals?page=0&size=500');
            setEntries((res.data.content || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (error) { console.error('Failed to load journals', error); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchJournals(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month]);
    useEffect(() => { fetchAccounts(); }, []);

    const openCreateModal = () => {
        form.setFieldsValue({ date: dayjs(), reference: '', description: '', lines: [{ debit: 0, credit: 0 }, { debit: 0, credit: 0 }] });
        setShowCreate(true);
    };
    const handleCreateJournal = async () => {
        try {
            const values = await form.validateFields();
            const lines = (values.lines || []).map(line => {
                const account = accounts.find(item => item.id === line.accountId);
                return { accountId: line.accountId, accountName: account?.name, description: line.description || '', debit: Number(line.debit || 0), credit: Number(line.credit || 0) };
            });
            const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
            const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
            const invalidLine = lines.some(line => !line.accountId || (line.debit <= 0 && line.credit <= 0) || (line.debit > 0 && line.credit > 0));
            if (invalidLine) { message.error('Each line needs an account and either a debit or a credit, not both.'); return; }
            if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) { message.error('Journal must balance: total debits must equal total credits.'); return; }
            await api.post('/finance/journals', { date: values.date.format('YYYY-MM-DD'), reference: values.reference, description: values.description, lines });
            message.success('Journal entry posted');
            setShowCreate(false);
            fetchJournals();
            fetchAccounts();
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error?.response?.data?.message || 'Failed to post journal entry');
        }
    };

    const visibleEntries = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return entries.filter(entry => {
            const date = dayjs(entry.date);
            const matchesMonth = !month || (date.isValid() && date.format('YYYY-MM') === month.format('YYYY-MM'));
            const matchesStatus = statusFilter === 'ALL' || entry.status === statusFilter;
            const values = [entry.reference, entry.description, entry.status, ...(entry.lines || []).flatMap(line => [line.accountName, line.description])];
            return matchesMonth && matchesStatus && (!query || values.some(value => String(value || '').toLowerCase().includes(query)));
        });
    }, [entries, month, searchTerm, statusFilter]);
    const summary = useMemo(() => visibleEntries.reduce((result, entry) => ({
        count: result.count + 1,
        lines: result.lines + (entry.lines || []).length,
        debit: result.debit + (entry.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0),
        credit: result.credit + (entry.lines || []).reduce((sum, line) => sum + Number(line.credit || 0), 0)
    }), { count: 0, lines: 0, debit: 0, credit: 0 }), [visibleEntries]);

    const columns = [
        { title: 'Journal', key: 'journal', width: 190, render: (_, record) => <div className="journals-primary-cell"><strong>{record.reference || 'No reference'}</strong><span>{dayjs(record.date).format('DD MMM YYYY')}</span></div> },
        { title: 'Description', dataIndex: 'description', key: 'description', render: value => <span className="journals-description">{value || 'No description provided'}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: status => <Tag className={`journals-status journals-status-${String(status || 'unknown').toLowerCase()}`}>{status || 'UNKNOWN'}</Tag> },
        { title: 'Debit', key: 'debit', align: 'right', width: 165, render: (_, record) => <span className="journals-money journals-debit">{money((record.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0))}</span> },
        { title: 'Credit', key: 'credit', align: 'right', width: 165, render: (_, record) => <span className="journals-money journals-credit">{money((record.lines || []).reduce((sum, line) => sum + Number(line.credit || 0), 0))}</span> },
        { title: 'Document', key: 'document', width: 105, render: (_, record) => { const url = record.receiptUrl || (record.lines || []).find(line => line.receiptUrl)?.receiptUrl; return url ? <Button size="small" type="link" icon={<FileText size={15} aria-hidden="true" />} onClick={() => window.open(url, '_blank')}>View</Button> : <span className="journals-no-document">—</span>; } }
    ];
    const expandedRowRender = record => {
        const lineColumns = [
            { title: 'Account', dataIndex: 'accountName', key: 'accountName', render: value => <strong className="journals-account-name">{value || 'Unspecified account'}</strong> },
            { title: 'Line description', dataIndex: 'description', key: 'description', render: value => value || '—' },
            { title: 'Debit', dataIndex: 'debit', key: 'debit', align: 'right', render: value => value ? <span className="journals-money journals-debit">{money(value)}</span> : '—' },
            { title: 'Credit', dataIndex: 'credit', key: 'credit', align: 'right', render: value => value ? <span className="journals-money journals-credit">{money(value)}</span> : '—' },
            { title: 'Document', dataIndex: 'receiptUrl', key: 'receiptUrl', render: value => value ? <Button size="small" type="link" onClick={() => window.open(value, '_blank')}>Open file</Button> : '—' }
        ];
        const debit = (record.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const credit = (record.lines || []).reduce((sum, line) => sum + Number(line.credit || 0), 0);
        return <section className="journals-detail" aria-label={`Journal details for ${record.reference || 'entry'}`}>
            <div className="journals-detail-heading"><div><span>Journal details</span><strong>{record.reference || 'No reference'}</strong></div><div className="journals-balance-state">Balanced · {money(debit)}</div></div>
            <div className="journals-detail-scroll" tabIndex={0} aria-label="Journal entry lines, horizontally scrollable on smaller screens"><Table columns={lineColumns} dataSource={(record.lines || []).map((line, index) => ({ ...line, rowKey: `${line.accountId || 'line'}-${index}` }))} pagination={false} size="small" rowKey="rowKey" /></div>
            <div className="journals-detail-totals"><span>Total</span><strong className="journals-debit">Debit {money(debit)}</strong><strong className="journals-credit">Credit {money(credit)}</strong></div>
        </section>;
    };

    const watchedLines = Form.useWatch('lines', form) || [];
    const draftDebit = watchedLines.reduce((sum, line) => sum + Number(line?.debit || 0), 0);
    const draftCredit = watchedLines.reduce((sum, line) => sum + Number(line?.credit || 0), 0);
    const draftBalanced = Math.round(draftDebit * 100) === Math.round(draftCredit * 100) && draftDebit > 0;

    return <main className="journals-page" aria-labelledby="journals-heading">
        <header className="journals-header"><div className="journals-heading-group"><button type="button" className="journals-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} aria-hidden="true" /></button><div><span className="journals-eyebrow">Sales &amp; Finance</span><h1 id="journals-heading">Journal entries</h1><p>Review balanced postings, account movements, references, and supporting documents.</p></div></div><Button type="primary" className="journals-primary-action" icon={<Plus size={17} aria-hidden="true" />} onClick={openCreateModal}>New journal entry</Button></header>
        <section className="journals-summary-grid" aria-label="Journal summary">
            <article className="journals-summary"><span className="journals-summary-icon"><BookOpen size={18} aria-hidden="true" /></span><div><span>Entries</span><strong>{summary.count}</strong><small>{summary.lines} posting lines</small></div></article>
            <article className="journals-summary journals-summary-debit"><span className="journals-summary-icon"><ArrowDownLeft size={18} aria-hidden="true" /></span><div><span>Total debits</span><strong>{money(summary.debit)}</strong><small>Selected journal period</small></div></article>
            <article className="journals-summary journals-summary-credit"><span className="journals-summary-icon"><ArrowUpRight size={18} aria-hidden="true" /></span><div><span>Total credits</span><strong>{money(summary.credit)}</strong><small>Selected journal period</small></div></article>
            <article className={`journals-summary journals-summary-balance ${Math.round(summary.debit * 100) === Math.round(summary.credit * 100) ? 'is-balanced' : 'is-unbalanced'}`}><span className="journals-summary-icon">=</span><div><span>Difference</span><strong>{money(summary.debit - summary.credit)}</strong><small>{Math.round(summary.debit * 100) === Math.round(summary.credit * 100) ? 'Ledger is balanced' : 'Review visible entries'}</small></div></article>
        </section>
        <section className="journals-workspace" aria-labelledby="journal-register-heading">
            <div className="journals-workspace-heading"><div><h2 id="journal-register-heading">Journal register</h2><p>Expand an entry to review its debit and credit lines.</p></div><Button icon={<RefreshCw size={16} aria-hidden="true" />} onClick={fetchJournals}>Refresh</Button></div>
            <div className="journals-filters" role="search" aria-label="Journal filters"><label className="journals-field journals-search-field"><span>Search journals</span><Input aria-label="Search journals" prefix={<Search size={16} aria-hidden="true" />} placeholder="Reference, description, or account" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} allowClear /></label><label className="journals-field"><span>Accounting period</span><DatePicker aria-label="Accounting period" picker="month" value={month} onChange={setMonth} allowClear={false} format="MMMM YYYY" /></label><label className="journals-field"><span>Status</span><Select aria-label="Journal status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'ALL', label: 'All statuses' }, { value: 'POSTED', label: 'Posted' }, { value: 'DRAFT', label: 'Draft' }, { value: 'PENDING', label: 'Pending' }]} /></label></div>
            <div className="journals-table-scroll" tabIndex={0} aria-label="Journal register table, horizontally scrollable on smaller screens"><Table className="journals-table" dataSource={visibleEntries} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 12, showSizeChanger: false, showTotal: total => `${total} entries` }} expandable={{ expandedRowRender }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span><strong>No journal entries found</strong><small>Adjust the period, search, or status filter.</small></span>} /> }} /></div>
        </section>
        <Modal rootClassName="journals-entry-modal" title={<div className="journals-modal-title"><span>Manual posting</span><strong>New journal entry</strong><p>Debit and credit totals must balance before posting.</p></div>} open={showCreate} onCancel={() => setShowCreate(false)} onOk={handleCreateJournal} okText="Post journal" cancelText="Cancel" width={960}>
            <Form form={form} layout="vertical" requiredMark={false}><div className="journals-form-grid journals-form-grid-meta"><Form.Item name="date" label="Posting date" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="reference" label="Reference" rules={[{ required: true }]}><Input placeholder="e.g. ADJ-2026-014" /></Form.Item></div><Form.Item name="description" label="Journal description" rules={[{ required: true }]}><Input placeholder="Describe the purpose of this journal" /></Form.Item>
                <div className="journals-lines-heading"><div><strong>Posting lines</strong><span>Add at least one debit and one credit line.</span></div><div className={`journals-draft-balance ${draftBalanced ? 'is-balanced' : ''}`}><span>Debit {money(draftDebit)}</span><span>Credit {money(draftCredit)}</span><strong>{draftBalanced ? 'Balanced' : `Difference ${money(draftDebit - draftCredit)}`}</strong></div></div>
                <Form.List name="lines">{(fields, { add, remove }) => <div className="journals-form-lines">{fields.map(({ key, name, ...restField }, index) => <fieldset className="journals-line" key={key}><legend>Line {index + 1}</legend><div className="journals-form-grid journals-line-grid"><Form.Item {...restField} name={[name, 'accountId']} label="Account" rules={[{ required: true, message: 'Account required' }]}><Select showSearch placeholder="Select account" optionFilterProp="label" options={accounts.map(account => ({ value: account.id, label: `${account.code || ''} ${account.name} (${account.type})` }))} /></Form.Item><Form.Item {...restField} name={[name, 'description']} label="Line description"><Input placeholder="Optional line note" /></Form.Item><Form.Item {...restField} name={[name, 'debit']} label="Debit (LKR)"><InputNumber min={0} precision={2} placeholder="0.00" /></Form.Item><Form.Item {...restField} name={[name, 'credit']} label="Credit (LKR)"><InputNumber min={0} precision={2} placeholder="0.00" /></Form.Item>{fields.length > 2 && <Button className="journals-remove-line" danger onClick={() => remove(name)} aria-label={`Remove line ${index + 1}`}>Remove</Button>}</div></fieldset>)}<Button className="journals-add-line" onClick={() => add({ debit: 0, credit: 0 })} icon={<Plus size={16} aria-hidden="true" />}>Add posting line</Button></div>}</Form.List>
            </Form>
        </Modal>
    </main>;
};
export default JournalEntryList;
