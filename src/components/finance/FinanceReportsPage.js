import { AlertCircle, ArrowLeft, CheckCircle2, Printer, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import api from '../../api/api';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';
import QuickDateRangeButtons from '../ReusableComponents/QuickDateRangeButtons';
import './FinanceReportsPage.css';

const REPORTS = { PL: ['Income statement', 'Revenue, expenses and net income'], BS: ['Balance sheet', 'Assets, liabilities and equity'], TB: ['Trial balance', 'Debit and credit control totals'] };
const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const Heading = ({ kicker, title, period }) => <header className="fr-statement-heading"><span>{kicker}</span><h2>{title}</h2><p>{period}</p></header>;
const Empty = ({ children }) => <div className="fr-empty"><strong>No report lines</strong><span>{children}</span></div>;

export default function FinanceReportsPage() {
    const navigate = useNavigate();
    const today = new Date().toISOString().slice(0, 10);
    const [tab, setTab] = useState('PL');
    const [start, setStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
    const [end, setEnd] = useState(today);
    const [asOf, setAsOf] = useState(today);
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const url = tab === 'PL' ? `/finance/reports/income-statement?start=${start}&end=${end}` : tab === 'BS' ? `/finance/reports/balance-sheet?asOfDate=${asOf}` : `/finance/reports/trial-balance?start=${start}&end=${end}`;
            const response = await api.get(url);
            setData(current => ({ ...current, [tab]: response.data }));
        } catch (requestError) {
            console.error(requestError);
            setError(`We couldn't load the ${REPORTS[tab][0].toLowerCase()}. Check the connection and try again.`);
        } finally { setLoading(false); }
    }, [asOf, end, start, tab]);
    useEffect(() => { load(); }, [load]);
    const quickRange = range => { setStart(range.startDate); setEnd(range.endDate); setAsOf(range.endDate); };
    const report = data[tab];

    return <main className="finance-reports-page">
        <header className="fr-header noprint"><div className="fr-heading"><button type="button" className="fr-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={18} /></button><div><span className="fr-eyebrow">Sales &amp; Finance</span><h1>Financial statements</h1><p>Review period performance, financial position, and ledger control totals.</p></div></div><Button variant="outline-primary" className="fr-print" onClick={() => window.print()}><Printer size={16} />Print {REPORTS[tab][0]}</Button></header>
        <nav className="fr-tabs noprint" role="tablist" aria-label="Financial statement views">{Object.entries(REPORTS).map(([id, value]) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls="finance-report-panel" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><span>{value[0]}</span><small>{value[1]}</small></button>)}</nav>
        <section className="fr-filters noprint" aria-labelledby="report-period-heading"><div><span id="report-period-heading">Reporting period</span><small>{tab === 'BS' ? 'Choose the statement date.' : 'Choose a start and end date.'}</small></div><div className="fr-filter-controls">{tab !== 'BS' && <Form.Group><Form.Label>From</Form.Label><SafeDatePicker name="startDate" value={start} onChange={e => setStart(e.target.value)} /></Form.Group>}<Form.Group><Form.Label>{tab === 'BS' ? 'As of date' : 'To'}</Form.Label><SafeDatePicker name={tab === 'BS' ? 'asOfDate' : 'endDate'} value={tab === 'BS' ? asOf : end} onChange={e => tab === 'BS' ? setAsOf(e.target.value) : setEnd(e.target.value)} /></Form.Group><div className="fr-quick"><span>Quick range</span><QuickDateRangeButtons onSelect={quickRange} /></div></div></section>
        {error && <Alert variant="danger" className="fr-error noprint" role="alert"><AlertCircle size={18} /><div><strong>Report unavailable</strong><span>{error}</span></div><Button variant="outline-danger" size="sm" onClick={load}><RefreshCw size={14} />Retry</Button></Alert>}
        <section id="finance-report-panel" role="tabpanel" className="fr-paper" aria-busy={loading}>
            {loading && <div className="fr-loading" role="status"><div /><div /><div className="table-skeleton" /><span>Preparing {REPORTS[tab][0].toLowerCase()}…</span></div>}
            {!loading && !error && tab === 'PL' && report && <IncomeStatement data={report} />}
            {!loading && !error && tab === 'BS' && report && <BalanceSheet data={report} />}
            {!loading && !error && tab === 'TB' && report && <TrialBalance data={report} />}
        </section>
    </main>;
}

function Summary({ items }) { return <div className="fr-summary">{items.map((item, index) => <div key={item[0]} className={index === items.length - 1 ? 'primary' : ''}><span>{item[0]}</span><strong>{money(item[1])}</strong></div>)}</div>; }
function IncomeStatement({ data }) { return <><Heading kicker="Performance" title="Income statement" period={`For the period ${data.startDate} to ${data.endDate}`} /><Summary items={[["Total revenue",data.totalRevenue],["Total expenses",data.totalExpenses],["Net income",data.netIncome]]} /><div className="fr-table-scroll" tabIndex="0" role="region" aria-label="Income statement table"><Table className="fr-table" hover><thead><tr><th>Account</th><th className="money">Amount (LKR)</th></tr></thead><tbody><Rows title="Revenue" rows={data.revenue} /><tr className="total"><td>Total revenue</td><td className="money">{money(data.totalRevenue)}</td></tr><Rows title="Expenses" rows={data.expenses} /><tr className="total"><td>Total expenses</td><td className="money">{money(data.totalExpenses)}</td></tr><tr className="grand"><td>Net income</td><td className="money">{money(data.netIncome)}</td></tr></tbody></Table></div>{!(data.revenue?.length || data.expenses?.length) && <Empty>No revenue or expense accounts have activity in this period.</Empty>}</>; }
function Rows({ title, rows = [] }) { return <><tr className={`section ${title.toLowerCase()}`}><td colSpan="2">{title}</td></tr>{rows.map(row => <tr key={row.accountId}><td data-label="Account"><strong>{row.accountName}</strong><small>{row.code}</small></td><td data-label="Amount (LKR)" className="money">{money(row.balance)}</td></tr>)}</>; }
function BalanceSheet({ data }) { return <><Heading kicker="Financial position" title="Balance sheet" period={`As of ${data.asOfDate}`} /><Summary items={[["Total assets",data.totalAssets],["Total liabilities",data.totalLiabilities],["Total equity",data.totalEquity]]} /><div className="fr-balance-grid"><BalanceGroup title="Assets" rows={data.assets} total={data.totalAssets} /><div><BalanceGroup title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} /><BalanceGroup title="Equity" rows={data.equity} total={data.totalEquity} /><div className="fr-equation"><span>Total liabilities + equity</span><strong>{money(data.totalLiabilities + data.totalEquity)}</strong></div></div></div></>; }
function BalanceGroup({ title, rows = [], total }) { return <section className="fr-balance-group"><h3>{title}</h3>{rows.map(row => <div key={row.accountId}><span><strong>{row.accountName}</strong><small>{row.code}</small></span><b>{money(row.balance)}</b></div>)}{!rows.length && <p>No {title.toLowerCase()} accounts to report.</p>}<div className="total"><span>Total {title.toLowerCase()}</span><b>{money(total)}</b></div></section>; }
function TrialBalance({ data }) { return <><Heading kicker="Ledger control" title="Trial balance" period={`For the period ${data.startDate} to ${data.endDate}`} /><div className={`fr-status ${data.isBalanced ? 'balanced' : 'unbalanced'}`}>{data.isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<div><strong>{data.isBalanced ? 'Debits and credits are balanced' : 'Debits and credits are out of balance'}</strong><span>{data.isBalanced ? 'Control totals agree for the selected period.' : 'Review unposted or incomplete journal entries.'}</span></div></div><div className="fr-table-scroll" tabIndex="0" role="region" aria-label="Trial balance table"><Table className="fr-table trial" hover><thead><tr><th>Code</th><th>Account name</th><th>Type</th><th className="money">Total debit</th><th className="money">Total credit</th><th className="money">Closing balance</th></tr></thead><tbody>{(data.lines || []).map((row,index) => <tr key={row.accountId || index}><td>{row.code}</td><td><strong>{row.accountName}</strong></td><td><span className={`fr-type type-${String(row.accountType).toLowerCase()}`}>{row.accountType}</span></td><td className="money">{row.totalDebit > 0 ? money(row.totalDebit) : '—'}</td><td className="money">{row.totalCredit > 0 ? money(row.totalCredit) : '—'}</td><td className="money">{money(Math.abs(row.closingBalance))} {row.closingBalance < 0 ? 'Cr' : 'Dr'}</td></tr>)}</tbody><tfoot><tr><td colSpan="3">Grand total</td><td className="money">{money(data.totalDebit)}</td><td className="money">{money(data.totalCredit)}</td><td className="money">{data.isBalanced ? 'Balanced' : 'Unbalanced'}</td></tr></tfoot></Table></div>{!data.lines?.length && <Empty>No ledger movements were found for the selected period.</Empty>}</>; }
