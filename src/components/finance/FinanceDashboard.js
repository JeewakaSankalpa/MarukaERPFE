import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, ArrowDownRight, ArrowLeft, ArrowUpRight, Banknote, Building2, CreditCard, Landmark, RefreshCw, Scale, Users } from 'lucide-react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import './FinanceDashboard.css';

const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinanceDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [range, setRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });
    const [data, setData] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await api.get(`/finance/reports/summary?start=${range.start}&end=${range.end}`);
            setData(res.data);
        } catch (requestError) {
            console.error('Finance summary load error:', requestError);
            setError("We couldn't load the finance summary. Check the reporting period and try again.");
        } finally { setLoading(false); }
    }, [range.end, range.start]);

    useEffect(() => { loadData(); }, [loadData]);

    const primaryMetrics = data ? [
        { label: 'Total inflow', value: data.totalInflow, detail: 'Cash received in the period', icon: ArrowDownRight, tone: 'positive' },
        { label: 'Total outflow', value: data.grandTotalOutflow, detail: 'Cash paid in the period', icon: ArrowUpRight, tone: 'negative' },
        { label: 'Net cash flow', value: data.netCashFlow, detail: Number(data.netCashFlow || 0) >= 0 ? 'Positive movement' : 'Negative movement', icon: Scale, tone: Number(data.netCashFlow || 0) >= 0 ? 'balance' : 'negative' }
    ] : [];
    const outflows = data ? [
        ['Operational expenses', data.totalOperationalExpenses, Building2], ['Payroll paid', data.totalPayroll, Users],
        ['Supplier payments', data.totalSupplierPayments, CreditCard], ['Asset purchases', data.totalAssetPayments, Landmark],
        ['Loan repayments', data.totalLoanRepayments, Banknote]
    ] : [];
    const actions = [
        ['Expenses', 'Review operating expenses', '/finance/expenses'], ['Migration', 'Manage opening balances', '/finance/migration'],
        ['Chart of accounts', 'Review account balances', '/finance/accounts'], ['Petty cash approvals', 'Review pending requests', '/finance/petty-cash-approvals'],
        ['Payroll', 'Open salary workspace', '/salary'], ['Assets', 'Review the asset register', '/assets'],
        ['Loan management', 'Review borrowing and lending', '/finance/loans']
    ];

    return <main className="finance-dashboard-page">
        <header className="fd-header"><div className="fd-heading-group"><button type="button" className="fd-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={18} /></button><div><span className="fd-eyebrow">Sales &amp; Finance</span><h1>Finance dashboard</h1><p>Monitor cash movement and move quickly into the finance workspaces that need attention.</p></div></div><Button variant="outline-primary" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? 'fd-spin' : ''} />{loading ? 'Refreshing' : 'Refresh'}</Button></header>
        <section className="fd-period" aria-labelledby="fd-period-heading"><div><strong id="fd-period-heading">Reporting period</strong><span>Summary values follow the selected dates.</span></div><div className="fd-date-controls"><Form.Group><Form.Label>From</Form.Label><SafeDatePicker name="start" value={range.start} onChange={event => setRange(current => ({ ...current, start: event.target.value }))} /></Form.Group><span className="fd-date-separator" aria-hidden="true">to</span><Form.Group><Form.Label>To</Form.Label><SafeDatePicker name="end" value={range.end} onChange={event => setRange(current => ({ ...current, end: event.target.value }))} /></Form.Group></div></section>
        {error && <div className="fd-error" role="alert"><AlertCircle size={20} /><div><strong>Finance summary unavailable</strong><span>{error}</span></div><Button variant="outline-danger" size="sm" onClick={loadData}>Retry</Button></div>}
        {loading && !data && <section className="fd-loading" aria-label="Loading finance summary" role="status"><div /><div /><div /><span>Loading finance summary…</span></section>}
        {data && <><section className="fd-metrics" aria-label="Cash flow summary" aria-busy={loading}>{primaryMetrics.map(({ label, value, detail, icon: Icon, tone }) => <article className={`fd-metric fd-metric--${tone}`} key={label}><div className="fd-metric-label"><span>{label}</span><Icon size={19} /></div><strong>{money(value)}</strong><small>{detail}</small></article>)}</section><div className="fd-workspace-grid"><section className="fd-panel" aria-labelledby="fd-outflows-heading"><header><div><span className="fd-section-kicker">Cash out</span><h2 id="fd-outflows-heading">Outflow breakdown</h2></div><strong>{money(data.grandTotalOutflow)}</strong></header><div className="fd-outflow-list">{outflows.map(([label, value, Icon]) => <div key={label}><span className="fd-outflow-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>Selected period</small></span><b>{money(value)}</b></div>)}</div></section><aside className="fd-panel fd-inflow-panel" aria-labelledby="fd-inflow-heading"><header><div><span className="fd-section-kicker">Cash in</span><h2 id="fd-inflow-heading">Inflow sources</h2></div></header><div className="fd-inflow-row"><span>Project income</span><strong>{money(data.incomeProjects)}</strong></div><div className="fd-inflow-row"><span>Loan proceeds</span><strong>{money(data.incomeLoans)}</strong></div><div className="fd-inflow-total"><span>Total inflow</span><strong>{money(data.totalInflow)}</strong></div></aside></div></>}
        <nav className="fd-actions" aria-labelledby="fd-actions-heading"><header><span className="fd-section-kicker">Workspace links</span><h2 id="fd-actions-heading">Continue in Finance</h2></header><div>{actions.map(([label, detail, path]) => <button type="button" key={path} onClick={() => navigate(path)}><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight size={17} /></button>)}</div></nav>
    </main>;
}
