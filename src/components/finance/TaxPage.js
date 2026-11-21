import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Percent, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import api from '../../api/api';
import './TaxPage.css';

const TAX_SETTINGS = [
    { key: 'GLOBAL_VAT_PERCENT', label: 'Global VAT rate', shortLabel: 'VAT', description: 'Default VAT percentage available to supported commercial documents.' },
    { key: 'GLOBAL_TAX_PERCENT', label: 'Global other tax rate', shortLabel: 'Other tax', description: 'Default additional tax percentage available to supported commercial documents.' },
];

const percent = value => {
    if (value === '' || value == null || Number.isNaN(Number(value))) return 'Not configured';
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}%`;
};

export default function TaxPage() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/settings');
            if (!Array.isArray(response.data)) throw new Error('Unexpected settings response');
            setSettings(response.data);
        } catch (requestError) {
            setError("We couldn't load the current tax configuration. Check the connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const taxSettings = useMemo(() => TAX_SETTINGS.map(item => {
        const match = settings.find(setting => setting.key === item.key);
        return { ...item, value: match?.value ?? '' };
    }), [settings]);
    const configuredCount = taxSettings.filter(item => item.value !== '' && item.value != null).length;

    return (
        <main className="tax-page operational-workspace">
            <header className="tax-header">
                <div className="tax-heading-group">
                    <button type="button" className="tax-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={18} aria-hidden="true" /></button>
                    <div><span className="tax-eyebrow">Sales &amp; Finance</span><h1>Tax &amp; VAT management</h1><p>Review the tax defaults currently available to commercial documents and confirm reporting readiness.</p></div>
                </div>
                <Button variant="outline-primary" onClick={loadSettings} disabled={loading}><RefreshCw size={16} className={loading ? 'tax-spin' : ''} aria-hidden="true" />{loading ? 'Refreshing' : 'Refresh'}</Button>
            </header>

            {error && <div className="tax-error" role="alert"><AlertCircle size={19} aria-hidden="true" /><div><strong>Tax configuration unavailable</strong><span>{error}</span></div><Button variant="outline-danger" size="sm" onClick={loadSettings}>Retry</Button></div>}

            <section className="tax-summary" aria-label="Tax configuration summary" aria-busy={loading}>
                {loading ? Array.from({ length: 3 }, (_, index) => <div className="tax-summary-skeleton" key={index}><span /><strong /></div>) : <>
                    {taxSettings.map(item => <article key={item.key}><span className="tax-summary-icon"><Percent size={18} aria-hidden="true" /></span><div><small>{item.shortLabel} default</small><strong>{percent(item.value)}</strong><span>{item.value === '' || item.value == null ? 'Requires configuration' : 'Configured in system settings'}</span></div></article>)}
                    <article><span className="tax-summary-icon tax-summary-icon--status"><ShieldCheck size={18} aria-hidden="true" /></span><div><small>Configuration status</small><strong>{configuredCount} of {TAX_SETTINGS.length}</strong><span>{configuredCount === TAX_SETTINGS.length ? 'Tax defaults are available' : 'Review missing defaults'}</span></div></article>
                </>}
            </section>

            <section className="tax-workspace operational-workspace-surface" aria-labelledby="tax-configuration-heading">
                <div className="tax-workspace-heading"><div><span className="tax-section-kicker">Current setup</span><h2 id="tax-configuration-heading">Tax configuration</h2><p>Read-only values from the existing system settings contract. Changes remain in System Settings and retain its permissions and validation.</p></div><Button variant="outline-secondary" onClick={() => navigate('/settings')}><Settings2 size={16} aria-hidden="true" />Open system settings</Button></div>
                {loading ? <div className="tax-table-loading" role="status"><span className="tax-spinner" aria-hidden="true" />Loading tax configuration…</div> : !error && <div className="tax-table-scroll" tabIndex="0" role="region" aria-label="Tax configuration table">
                    <Table className="tax-table" hover>
                        <thead><tr><th>Configuration</th><th>System key</th><th className="tax-number">Current value</th><th>Status</th></tr></thead>
                        <tbody>{taxSettings.map(item => {
                            const configured = item.value !== '' && item.value != null;
                            return <tr key={item.key}><td data-label="Configuration"><strong>{item.label}</strong><span>{item.description}</span></td><td data-label="System key"><code>{item.key}</code></td><td data-label="Current value" className="tax-number"><strong>{percent(item.value)}</strong></td><td data-label="Status"><span className={`tax-status ${configured ? 'is-ready' : 'is-missing'}`}>{configured ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}{configured ? 'Configured' : 'Not configured'}</span></td></tr>;
                        })}</tbody>
                    </Table>
                </div>}
            </section>

            <section className="tax-readiness" aria-labelledby="tax-reporting-heading">
                <div className="tax-readiness-icon"><FileText size={22} aria-hidden="true" /></div>
                <div><span className="tax-section-kicker">Reporting</span><h2 id="tax-reporting-heading">Tax reporting is not connected yet</h2><p>The application does not currently expose a dedicated tax-return or VAT-reporting API. No totals are estimated here, so financial calculations and source documents remain unchanged.</p></div>
                <span className="tax-readiness-badge">Read-only workspace</span>
            </section>
        </main>
    );
}
