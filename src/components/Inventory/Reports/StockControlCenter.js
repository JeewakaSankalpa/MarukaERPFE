import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Download, MapPin, Package, RefreshCw, Search, Truck, X } from 'lucide-react';
import api from '../../../api/api';
import './StockControlCenter.css';

const MAIN_STORE = 'LOC_STORES_MAIN';
const asNumber = value => Number(value || 0);
const qty = value => asNumber(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const money = value => `Rs. ${asNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleDateString() : '—';
const localDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const initialRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 89);
  return { startDate: localDate(start), endDate: localDate(end) };
};
const presetRange = days => {
  const end = new Date();
  const start = new Date(end);
  if (days === 'quarter') start.setMonth(Math.floor(end.getMonth() / 3) * 3, 1);
  else if (days === 'year') start.setMonth(0, 1);
  else start.setDate(end.getDate() - days + 1);
  return { startDate: localDate(start), endDate: localDate(end) };
};
const labelType = type => ({ GRN_RECEIPT: 'GRN receipt', OPENING_STOCK: 'Opening stock', ISSUE: 'Issued / transfer out', TRANSFER_IN: 'Transfer received', ADJUSTMENT_IN: 'Audit / adjustment in', ADJUSTMENT_OUT: 'Audit / adjustment out', RETURN_TO_SUPPLIER: 'Supplier return', CONSUMPTION: 'Consumed', RETURN_IN: 'Return in', DAMAGED_RETURN: 'Damaged return', RETURN_OUT: 'Return out', DAMAGED_IN: 'Damaged holding' }[type] || type || 'Other');
const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

function downloadCsv(filename, rows) {
  const content = '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
  const href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function Summary({ label, value, note, icon: Icon, tone = 'default', onClick }) {
  const content = <><span className="scc-metric-icon"><Icon size={18} aria-hidden="true" /></span><span className="scc-metric-copy"><span className="scc-eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></span>{onClick && <ArrowRight size={16} aria-hidden="true" />}</>;
  return onClick ? <button type="button" className={`scc-metric scc-metric-${tone}`} onClick={onClick}>{content}</button> : <div className={`scc-metric scc-metric-${tone}`}>{content}</div>;
}

export default function StockControlCenter() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [positionLoading, setPositionLoading] = useState(true);
  const [positionError, setPositionError] = useState('');
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [issue, setIssue] = useState('');
  const [selection, setSelection] = useState(null);
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [range, setRange] = useState(initialRange);
  const [movementType, setMovementType] = useState('');
  const [movementProduct, setMovementProduct] = useState('');
  const [movementPage, setMovementPage] = useState(0);
  const [movements, setMovements] = useState(null);
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementError, setMovementError] = useState('');

  const loadPosition = useCallback(async () => {
    setPositionLoading(true);
    setPositionError('');
    try {
      const response = await api.get('/reports/stock-control');
      setPosition(response.data);
    } catch (error) {
      setPositionError(error.response?.data?.message || 'Could not load the current stock position.');
    } finally {
      setPositionLoading(false);
    }
  }, []);

  useEffect(() => { loadPosition(); }, [loadPosition]);

  const loadMovements = useCallback(async () => {
    if (range.endDate < range.startDate) { setMovementError('End date must be on or after start date.'); return; }
    setMovementLoading(true);
    setMovementError('');
    try {
      const response = await api.get('/reports/stock-control/movements', { params: {
        ...range, page: movementPage, ...(location ? { locationId: location } : {}), ...(movementType ? { type: movementType } : {}), ...(movementProduct ? { productId: movementProduct } : {})
      } });
      setMovements(response.data);
    } catch (error) {
      setMovementError(error.response?.data?.message || 'Could not load movement history.');
    } finally {
      setMovementLoading(false);
    }
  }, [range, movementPage, location, movementType, movementProduct]);

  useEffect(() => { if (tab === 'movements') loadMovements(); }, [tab, loadMovements]);
  useEffect(() => { setMovementPage(0); }, [range, location, movementType, movementProduct]);
  useEffect(() => {
    if (!selection) return undefined;
    drawerRef.current?.querySelector('button')?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') setSelection(null);
      if (event.key === 'Tab' && drawerRef.current) {
        const buttons = [...drawerRef.current.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); previousFocusRef.current?.focus(); };
  }, [selection]);

  const batches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (position?.batches || []).filter(batch =>
      (!location || batch.locationId === location) &&
      (!condition || batch.condition === condition) &&
      (!issue || (issue === 'cost' && batch.costSource === 'MISSING') ||
        (issue === 'source' && batch.projectId && !batch.sourceBatchId && !batch.grnId) ||
        (issue === 'expiry' && batch.expiryDate && new Date(batch.expiryDate) < new Date())) &&
      (!query || [batch.productName, batch.sku, batch.batchNo, batch.locationName, batch.itemRequestNumber]
        .some(value => String(value || '').toLowerCase().includes(query)))
    );
  }, [position, search, location, condition, issue]);

  const groupedProducts = useMemo(() => {
    const groups = new Map();
    batches.forEach(batch => {
      const existing = groups.get(batch.productId) || { id: batch.productId, name: batch.productName, sku: batch.sku, unit: batch.unit, quantity: 0, value: 0, damaged: 0, batches: 0, locations: new Set() };
      existing.quantity += asNumber(batch.quantity);
      existing.value += asNumber(batch.value);
      existing.damaged += batch.condition === 'DAMAGED' ? asNumber(batch.quantity) : 0;
      existing.batches++;
      existing.locations.add(batch.locationId);
      groups.set(batch.productId, existing);
    });
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [batches]);

  const locationRows = useMemo(() => (position?.locations || []).filter(row => !location || row.id === location), [position, location]);
  const visibleMovements = useMemo(() => (movements?.rows || []).filter(row => !search.trim() || [row.productId, row.refDocId, row.refDocType, row.batchId].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))), [movements, search]);
  const inTransitQty = (position?.pendingTransfers || []).filter(row => row.sourceDeductedOnIssue).reduce((sum, row) => sum + asNumber(row.quantity), 0);
  const unassigned = (position?.locations || []).find(row => row.id === 'UNASSIGNED');
  const totalQty = asNumber(position?.quantity);

  const openSelection = (kind, id, title) => { previousFocusRef.current = document.activeElement; setSelection({ kind, id, title }); };
  const selectedBatches = selection ? (position?.batches || []).filter(batch => selection.kind === 'product' ? batch.productId === selection.id : batch.locationId === selection.id) : [];
  const exportCurrent = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (tab === 'movements') {
      downloadCsv(`stock-movements-${stamp}.csv`, [['Date', 'Type', 'Product ID', 'Location', 'In', 'Out', 'Unit cost', 'Reference type', 'Reference ID', 'Batch ID', 'Recorded by'], ...visibleMovements.map(row => [row.at, labelType(row.type), row.productId, row.locationId, row.quantityIn, row.quantityOut, row.unitCost, row.refDocType, row.refDocId, row.batchId, row.recordedBy])]);
      return;
    }
    downloadCsv(`stock-position-${stamp}.csv`, [['Product', 'SKU', 'Location', 'Condition', 'Batch', 'Quantity', 'Unit', 'Unit cost', 'Value', 'GRN ID', 'PO ID', 'Source batch ID'], ...batches.map(row => [row.productName, row.sku, row.locationName, row.condition, row.batchNo, row.quantity, row.unit, row.unitCost, row.value, row.grnId, row.poId, row.sourceBatchId])]);
  };

  return <main className="scc-page">
    <div className="scc-wrap">
      <header className="scc-header">
        <div><span className="scc-overline">REPORTS / INVENTORY</span><h1>Stock Control Center</h1><p>Follow stock across stores, projects, transfers, returns and adjustments.</p></div>
        <div className="scc-header-actions"><button type="button" className="scc-button scc-button-quiet" onClick={loadPosition} disabled={positionLoading}><RefreshCw size={16} /> Refresh</button><button type="button" className="scc-button scc-button-primary" onClick={exportCurrent} disabled={!position}><Download size={16} /> Export {tab === 'movements' ? 'page' : 'stock'}</button></div>
      </header>

      {positionError && <div className="scc-alert" role="alert"><AlertCircle size={18} /><span>{positionError}</span><button type="button" onClick={loadPosition}>Try again</button></div>}
      {positionLoading && !position ? <div className="scc-loading" aria-live="polite" aria-busy="true"><div className="scc-skeleton scc-skeleton-title" /><div className="scc-skeleton scc-skeleton-metrics" /><div className="scc-skeleton scc-skeleton-table" /></div> : position && <>
        <div className="scc-context"><span><CheckCircle2 size={15} /> Live recorded balances</span><span>Updated {new Date(position.generatedAt).toLocaleString()}</span><span>Quantity totals combine different units; compare products individually.</span></div>
        <section className="scc-summary" aria-label="Stock position summary">
          <Summary label="Stock value" value={money(position.value)} note="Recorded positive batches" icon={Boxes} />
          <Summary label="Main Store" value={qty(position.mainStoreQuantity)} note="Units across products" icon={Package} onClick={() => { setLocation(MAIN_STORE); setTab('locations'); }} />
          <Summary label="At projects" value={qty(position.projectQuantity)} note="Held, not yet consumed" icon={MapPin} onClick={() => setTab('locations')} />
          <Summary label="In transit" value={qty(inTransitQty)} note={`${(position.pendingTransfers || []).length} pending transfer(s)`} icon={Truck} tone="warning" onClick={() => setTab('exceptions')} />
          <Summary label="Damaged holding" value={qty(position.damagedQuantity)} note="Included in stock value" icon={AlertCircle} tone="danger" onClick={() => { setCondition('DAMAGED'); setTab('products'); }} />
        </section>

        <nav className="scc-tabs" aria-label="Stock report views">{[['overview', 'Overview'], ['locations', 'Locations & projects'], ['products', 'Products & batches'], ['movements', 'Movement ledger'], ['exceptions', 'Needs attention']].map(([key, label]) => <button type="button" key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>)}</nav>

        <div className="scc-filter-bar"><label className="scc-search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">{tab === 'movements' ? 'Search loaded movement page' : 'Search products, batches and references'}</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={tab === 'movements' ? 'Search this ledger page' : 'Search product, SKU, batch or reference'} /></label><label className="scc-select"><span className="visually-hidden">Location</span><select value={location} onChange={event => setLocation(event.target.value)}><option value="">All locations</option>{(position.locations || []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="scc-select"><span className="visually-hidden">Condition</span><select value={condition} onChange={event => setCondition(event.target.value)}><option value="">All conditions</option><option value="USABLE">Usable</option><option value="DAMAGED">Damaged</option></select></label><label className="scc-select"><span className="visually-hidden">Data issue</span><select value={issue} onChange={event => setIssue(event.target.value)}><option value="">All records</option><option value="cost">Missing cost</option><option value="source">Missing project source</option><option value="expiry">Expired</option></select></label>{(search || location || condition || issue) && <button type="button" className="scc-clear" onClick={() => { setSearch(''); setLocation(''); setCondition(''); setIssue(''); }}>Clear filters</button>}</div>

        {tab === 'overview' && <div className="scc-overview-grid"><section className="scc-section"><div className="scc-section-heading"><div><span className="scc-overline">01 / STOCK POSITION</span><h2>Where stock sits now</h2></div><button type="button" className="scc-text-button" onClick={() => setTab('locations')}>All locations <ArrowRight size={15} /></button></div><div className="scc-location-bars">{locationRows.length ? locationRows.slice(0, 10).map(row => <button type="button" key={row.id} className="scc-location-bar" onClick={() => openSelection('location', row.id, row.name)}><span className="scc-location-bar-label"><strong>{row.name}</strong><small>{row.batches} batches · {money(row.value)}</small></span><span className="scc-bar-track"><span style={{ width: `${Math.max(2, totalQty ? asNumber(row.quantity) / totalQty * 100 : 0)}%` }} /></span><span className="scc-number">{qty(row.quantity)}</span></button>) : <p className="scc-empty">No location matches the current filters.</p>}</div></section><aside className="scc-section scc-attention"><div className="scc-section-heading"><div><span className="scc-overline">02 / REVIEW QUEUE</span><h2>Needs attention</h2></div></div><button type="button" onClick={() => setTab('exceptions')}><Truck size={18} /><span><strong>{(position.pendingTransfers || []).length} transfers awaiting acceptance</strong><small>Source issued stock is shown in transit.</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => navigate('/inventory/audit-approvals')}><ClipboardCheck size={18} /><span><strong>{position.pendingAuditCount} audits awaiting approval</strong><small>Count differences have not changed stock yet.</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => { setCondition('DAMAGED'); setTab('products'); }}><AlertCircle size={18} /><span><strong>{qty(position.damagedQuantity)} damaged stock held</strong><small>Inspect before reuse or disposal.</small></span><ArrowRight size={16} /></button>{unassigned && <button type="button" onClick={() => { setLocation('UNASSIGNED'); setTab('products'); }}><MapPin size={18} /><span><strong>{qty(unassigned.quantity)} at unassigned location</strong><small>Check missing location ownership.</small></span><ArrowRight size={16} /></button>}</aside></div>}

        {tab === 'locations' && <section className="scc-section"><div className="scc-section-heading"><div><span className="scc-overline">LOCATION REGISTER</span><h2>Stores and project holdings</h2><p>Click a location to inspect its product batches and source documents.</p></div><span className="scc-count">{locationRows.length} locations</span></div><div className="scc-table-wrap"><table className="scc-table"><thead><tr><th>Location</th><th className="number">Batches</th><th className="number">Quantity</th><th className="number">Damaged</th><th className="number">Value</th><th><span className="visually-hidden">Details</span></th></tr></thead><tbody>{locationRows.map(row => <tr key={row.id}><td><button type="button" className="scc-row-link" onClick={() => openSelection('location', row.id, row.name)}>{row.name}</button><small className="scc-cell-sub">{row.id}</small></td><td className="number">{row.batches}</td><td className="number">{qty(row.quantity)}</td><td className="number">{qty(row.damagedQuantity)}</td><td className="number">{money(row.value)}</td><td><button type="button" className="scc-icon-button" aria-label={`Inspect ${row.name}`} onClick={() => openSelection('location', row.id, row.name)}><ArrowRight size={17} /></button></td></tr>)}</tbody></table>{!locationRows.length && <p className="scc-empty">No locations match the current filter.</p>}</div></section>}

        {tab === 'products' && <section className="scc-section"><div className="scc-section-heading"><div><span className="scc-overline">PRODUCT REGISTER</span><h2>Products and batches</h2><p>Balances include Main Store, projects, other stores and damaged holding.</p></div><span className="scc-count">{groupedProducts.length} products · {batches.length} batches</span></div><div className="scc-table-wrap"><table className="scc-table"><thead><tr><th>Product</th><th className="number">Locations</th><th className="number">Batches</th><th className="number">Quantity</th><th className="number">Damaged</th><th className="number">Value</th><th><span className="visually-hidden">Details</span></th></tr></thead><tbody>{groupedProducts.map(row => <tr key={row.id}><td><button type="button" className="scc-row-link" onClick={() => openSelection('product', row.id, row.name)}>{row.name}</button><small className="scc-cell-sub">{row.sku || row.id}{row.unit ? ` · ${row.unit}` : ''}</small></td><td className="number">{row.locations.size}</td><td className="number">{row.batches}</td><td className="number">{qty(row.quantity)}</td><td className="number">{qty(row.damaged)}</td><td className="number">{money(row.value)}</td><td><button type="button" className="scc-icon-button" aria-label={`Inspect ${row.name}`} onClick={() => openSelection('product', row.id, row.name)}><ArrowRight size={17} /></button></td></tr>)}</tbody></table>{!groupedProducts.length && <p className="scc-empty">No products match these filters. Clear filters to see all recorded stock.</p>}</div></section>}

        {tab === 'movements' && <div className="scc-presets" aria-label="Movement date presets">{[[30, '30 days'], [60, '60 days'], [90, '90 days'], ['quarter', 'This quarter'], ['year', 'This year']].map(([value, label]) => <button type="button" key={value} onClick={() => setRange(presetRange(value))}>{label}</button>)}{movementProduct && <button type="button" className="scc-active-filter" onClick={() => setMovementProduct('')}>Product: {(position.products || []).find(row => row.id === movementProduct)?.name || movementProduct} <X size={13} /></button>}</div>}
        {tab === 'movements' && <label className="scc-movement-product">Product <select value={movementProduct} onChange={event => setMovementProduct(event.target.value)}><option value="">All products</option>{(position.products || []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
        {tab === 'movements' && <section className="scc-section"><div className="scc-section-heading"><div><span className="scc-overline">DATED ACTIVITY</span><h2>Movement ledger</h2><p>Each row is a recorded stock movement. Transfer out and transfer in are shown separately.</p></div><span className="scc-count">{movements?.total ?? '—'} movements</span></div><div className="scc-date-filters"><label>From<input type="date" value={range.startDate} onChange={event => setRange(current => ({ ...current, startDate: event.target.value }))} /></label><label>To<input type="date" value={range.endDate} onChange={event => setRange(current => ({ ...current, endDate: event.target.value }))} /></label><label>Movement<select value={movementType} onChange={event => setMovementType(event.target.value)}><option value="">All types</option>{['GRN_RECEIPT', 'OPENING_STOCK', 'ISSUE', 'TRANSFER_IN', 'CONSUMPTION', 'RETURN_IN', 'DAMAGED_RETURN', 'RETURN_TO_SUPPLIER', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].map(type => <option key={type} value={type}>{labelType(type)}</option>)}</select></label><button type="button" className="scc-button scc-button-quiet" onClick={loadMovements}><RefreshCw size={15} /> Reload</button></div>{movementError && <div className="scc-alert" role="alert"><AlertCircle size={17} />{movementError}<button type="button" onClick={loadMovements}>Try again</button></div>}{movementLoading ? <div className="scc-skeleton scc-skeleton-table" aria-label="Loading movements" /> : <div className="scc-table-wrap"><table className="scc-table"><thead><tr><th>Date</th><th>Movement</th><th>Product</th><th>Location</th><th className="number">In</th><th className="number">Out</th><th>Reference</th></tr></thead><tbody>{visibleMovements.map(row => <tr key={row.id}><td>{date(row.at)}</td><td><span className={`scc-movement ${asNumber(row.quantityOut) ? 'out' : 'in'}`}>{asNumber(row.quantityOut) ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}{labelType(row.type)}</span></td><td>{(position.products || []).find(p => p.id === row.productId)?.name || row.productId}<small className="scc-cell-sub">{row.productId}</small></td><td>{(position.locations || []).find(p => p.id === row.locationId)?.name || row.locationId || 'Unassigned'}</td><td className="number scc-positive">{asNumber(row.quantityIn) ? qty(row.quantityIn) : '—'}</td><td className="number scc-negative">{asNumber(row.quantityOut) ? qty(row.quantityOut) : '—'}</td><td>{row.refDocType || '—'}<small className="scc-cell-sub">{row.refDocId || 'No reference'}</small></td></tr>)}</tbody></table>{!visibleMovements.length && !movementError && <p className="scc-empty">No movements in this range match the filters.</p>}</div>}<div className="scc-pager"><span>Page {movementPage + 1} of {Math.max(1, Math.ceil(asNumber(movements?.total) / 100))}. CSV exports this page.</span><div><button type="button" disabled={movementPage === 0 || movementLoading} onClick={() => setMovementPage(page => page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><button type="button" disabled={!movements || (movementPage + 1) * 100 >= asNumber(movements.total) || movementLoading} onClick={() => setMovementPage(page => page + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div></section>}

        {tab === 'exceptions' && <div className="scc-overview-grid"><section className="scc-section"><div className="scc-section-heading"><div><span className="scc-overline">TRANSFER QUEUE</span><h2>Awaiting destination acceptance</h2><p>Only issued transfers count as in transit. An acceptance creates the destination stock.</p></div></div>{(position.pendingTransfers || []).length ? <div className="scc-exception-list">{position.pendingTransfers.map(row => <div key={row.id}><span className="scc-exception-icon"><Truck size={17} /></span><span><strong>{row.number || row.id}</strong><small>{row.fromLocationId || 'Unknown source'} → {row.toLocationId || 'Unknown destination'} · {date(row.createdAt)}</small></span><span className="scc-exception-right"><strong>{qty(row.quantity)}</strong><small>{row.sourceDeductedOnIssue ? 'In transit' : 'Source issue not confirmed'}</small></span></div>)}</div> : <p className="scc-empty">No transfers are awaiting acceptance.</p>}</section><aside className="scc-section scc-attention"><div className="scc-section-heading"><div><span className="scc-overline">INVESTIGATION LINKS</span><h2>Review and resolve</h2></div></div><button type="button" onClick={() => navigate('/inventory/audit-approvals')}><ClipboardCheck size={18} /><span><strong>Audit approvals</strong><small>{position.pendingAuditCount} pending. Review counted differences before stock changes.</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => navigate('/inventory/stock-taking')}><Package size={18} /><span><strong>Start a stock count</strong><small>Capture physical quantity against the ERP balance.</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => { setTab('movements'); setMovementType('ADJUSTMENT_OUT'); }}><AlertCircle size={18} /><span><strong>Audit decreases</strong><small>Inspect adjustment-out entries and their source references.</small></span><ArrowRight size={16} /></button></aside></div>}

        {tab === 'exceptions' && <section className="scc-section scc-return-queue"><div className="scc-section-heading"><div><span className="scc-overline">RETURN QUEUE</span><h2>Returns awaiting a decision</h2></div></div><div><button type="button" onClick={() => navigate('/inventory/returns/approvals')}><span><strong>{position.pendingInternalReturnCount || 0} internal returns</strong><small>Project and department returns pending approval.</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => navigate('/inventory/supplier-returns/approvals')}><span><strong>{position.pendingSupplierReturnCount || 0} supplier returns</strong><small>Supplier return requests pending approval.</small></span><ArrowRight size={16} /></button></div></section>}
        {tab === 'exceptions' && <section className="scc-section scc-data-quality"><div className="scc-section-heading"><div><span className="scc-overline">DATA QUALITY</span><h2>Records to investigate</h2></div></div><div><button type="button" onClick={() => { setIssue('cost'); setTab('products'); }}><strong>{position.missingCostBatches || 0}</strong><small>Batches without a cost source</small></button><button type="button" onClick={() => { setIssue('source'); setTab('products'); }}><strong>{position.missingProjectSourceBatches || 0}</strong><small>Project batches without source batch or GRN</small></button><button type="button" onClick={() => { setIssue('expiry'); setTab('products'); }}><strong>{position.expiredBatches || 0}</strong><small>Positive batches past expiry</small></button></div><p>Open a count to inspect the affected batches. An empty count does not confirm physical stock accuracy.</p></section>}
        <footer className="scc-footnote"><strong>How to read this report.</strong> Current stock comes from positive batch balances. Movement dates filter ledger entries only. Pending transfers, returns and audits are shown separately; an audit decrease is not automatically classified as a confirmed loss. Cost uses the batch unit cost, with the product cost as fallback. Product types and employee tool custody are not recorded as dedicated stock states in the current data model.</footer>
      </>}
    </div>

    {selection && <div className="scc-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelection(null); }}><aside ref={drawerRef} className="scc-drawer" role="dialog" aria-modal="true" aria-label={`${selection.title} stock breakdown`}><header><div><span className="scc-overline">{selection.kind === 'product' ? 'PRODUCT BREAKDOWN' : 'LOCATION BREAKDOWN'}</span><h2>{selection.title}</h2><p>{selectedBatches.length} positive batches · {qty(selectedBatches.reduce((sum, row) => sum + asNumber(row.quantity), 0))} total quantity</p></div><button type="button" className="scc-icon-button" onClick={() => setSelection(null)} aria-label="Close breakdown"><X size={20} /></button></header><div className="scc-drawer-body">{selectedBatches.map(batch => <article key={batch.batchId} className="scc-batch"><div><strong>{batch.productName}</strong><span className={batch.condition === 'DAMAGED' ? 'scc-tag danger' : 'scc-tag'}>{batch.condition === 'DAMAGED' ? 'Damaged holding' : 'Usable'}</span></div><p>{batch.locationName} · Batch {batch.batchNo || batch.batchId || 'Unnumbered'}</p><dl><div><dt>Quantity</dt><dd>{qty(batch.quantity)} {batch.unit || ''}</dd></div><div><dt>Unit cost</dt><dd>{money(batch.unitCost)}{batch.costSource === 'MISSING' && <span className="scc-cost-note">Missing cost</span>}{batch.costSource === 'PRODUCT_FALLBACK' && <span className="scc-cost-note">Product fallback</span>}</dd></div><div><dt>Value</dt><dd>{money(batch.value)}</dd></div><div><dt>Expiry</dt><dd>{date(batch.expiryDate)}</dd></div><div><dt>GRN</dt><dd>{batch.grnId || '—'}</dd></div><div><dt>PO</dt><dd>{batch.poId || '—'}</dd></div><div><dt>Source batch</dt><dd>{batch.sourceBatchId || '—'}</dd></div><div><dt>Item request</dt><dd>{batch.itemRequestNumber || '—'}</dd></div></dl></article>)}{!selectedBatches.length && <p className="scc-empty">No positive batches are recorded here.</p>}</div><footer><button type="button" className="scc-button scc-button-quiet" onClick={() => { setTab('movements'); setLocation(selection.kind === 'location' ? selection.id : ''); setMovementProduct(selection.kind === 'product' ? selection.id : ''); setSelection(null); }}>View movement ledger <ArrowRight size={15} /></button></footer></aside></div>}
  </main>;
}
