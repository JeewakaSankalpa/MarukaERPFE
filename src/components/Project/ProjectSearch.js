import { ArrowDown, ArrowLeft, ArrowUp, BriefcaseBusiness, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Container, Form, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import api from '../../api/api';
import './ProjectSearch.css';

const inquiryTypeOptions = [{ value: '', label: 'All inquiry types' }, { value: 'JOB', label: 'Job inquiry' }, { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'RETAIL_SALE', label: 'Retail sale' }];
const jobStatusOptions = [{ value: '', label: 'All project records' }, { value: 'WITH_MJN', label: 'Jobs with MJN' }, { value: 'WITHOUT_MJN', label: 'Inquiries only' }];
const inquiryTypeLabels = { JOB: 'Job inquiry', MAINTENANCE: 'Maintenance', RETAIL_SALE: 'Retail sale' };
const inquiryTypeBadge = { JOB: 'primary', MAINTENANCE: 'warning', RETAIL_SALE: 'success' };
const columnModeLabels = ['Inquiry + job IDs', 'Inquiry IDs only', 'Job IDs only'];
const displayValue = (value, fallback = 'Not set') => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value.name || value.label || value.stageName || value.stageType || fallback;
    return String(value).replaceAll('_', ' ');
};

function ProjectSearch() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [projectId, setProjectId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [salesRepName, setSalesRepName] = useState('');
    const [status, setStatus] = useState('');
    const [inquiryType, setInquiryType] = useState('');
    const [mjnStatus, setMjnStatus] = useState('');
    const [sortField, setSortField] = useState('id');
    const [sortDirection, setSortDirection] = useState('desc');
    const [columnMode, setColumnMode] = useState(0);
    const [availableStatuses, setAvailableStatuses] = useState([]);

    useEffect(() => { api.get('/workflow/stages').then(res => setAvailableStatuses(res.data || [])).catch(() => {}); }, []);

    const fetchRows = async () => {
        try {
            setLoading(true); setLoadError('');
            const params = {};
            if (projectId.trim()) params.projectId = projectId.trim();
            if (projectName.trim()) params.projectName = projectName.trim();
            if (customerName.trim()) params.customerName = customerName.trim();
            if (salesRepName.trim()) params.salesRepName = salesRepName.trim();
            if (status) params.status = status;
            if (inquiryType) params.inquiryType = inquiryType;
            if (mjnStatus === 'WITH_MJN') params.hasJobNumber = true;
            if (mjnStatus === 'WITHOUT_MJN') params.hasJobNumber = false;
            const res = await api.get('/projects/search', { params });
            setRows(res.data || []);
        } catch (error) {
            console.error(error); setLoadError('Projects could not be loaded. Check your connection and try again.'); toast.error('Failed to load projects');
        } finally { setLoading(false); }
    };

    useEffect(() => {
        const timer = setTimeout(fetchRows, 300);
        return () => clearTimeout(timer);
        // fetchRows intentionally follows the filter dependency list for debounced API queries.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, projectName, customerName, salesRepName, status, inquiryType, mjnStatus]);

    const handleSort = (field) => {
        if (sortField === field) setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDirection('desc'); }
    };
    const sortedRows = useMemo(() => [...rows].sort((a, b) => {
        const valA = displayValue(a[sortField], '').toLocaleLowerCase();
        const valB = displayValue(b[sortField], '').toLocaleLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
    }), [rows, sortField, sortDirection]);
    const clearFilters = () => { setProjectId(''); setProjectName(''); setCustomerName(''); setSalesRepName(''); setStatus(''); setInquiryType(''); setMjnStatus(''); setSortField('id'); setSortDirection('desc'); };
    const activeFilterCount = [projectId, projectName, customerName, salesRepName, status, inquiryType, mjnStatus].filter(Boolean).length;
    const jobsCount = rows.filter(row => row.jobNumber).length;
    const statusOptions = [{ value: '', label: 'All workflow stages' }, ...availableStatuses.map(stage => ({ value: typeof stage === 'string' ? stage : stage.id || stage.stageType || stage.name, label: displayValue(stage) }))];
    const SortIcon = ({ field }) => sortField === field ? (sortDirection === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />) : null;

    return <Container fluid className="project-search-page operational-workspace">
        <section className="project-search-workspace operational-workspace-surface" aria-labelledby="projects-heading">
            <header className="project-search-header">
                <div className="project-search-heading-group"><button type="button" className="project-search-back" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} aria-hidden="true" /></button><div><h1 id="projects-heading">My Projects</h1><p>Find inquiries and jobs, review ownership, and open the project workspace.</p></div></div>
                <Button className="project-search-create" onClick={() => navigate('/projects/create')}><Plus size={18} aria-hidden="true" /> Create new inquiry</Button>
            </header>
            <div className="project-search-summary" aria-label="Current project results">
                <div><span>Results</span><strong>{loading ? '—' : rows.length}</strong></div><div><span>Active jobs</span><strong>{loading ? '—' : jobsCount}</strong></div><div><span>Inquiry only</span><strong>{loading ? '—' : rows.length - jobsCount}</strong></div>
                <div className="project-search-summary-note"><BriefcaseBusiness size={18} aria-hidden="true" /><span>Results update automatically as filters change.</span></div>
            </div>
            <Form className="project-search-filters" role="search" aria-label="Project filters" onSubmit={event => { event.preventDefault(); fetchRows(); }}>
                <div className="project-search-filter-heading"><div><SlidersHorizontal size={17} aria-hidden="true" /><strong>Filter projects</strong>{activeFilterCount > 0 && <Badge bg="primary">{activeFilterCount} active</Badge>}</div><Button type="button" variant="link" onClick={clearFilters} disabled={!activeFilterCount}>Clear filters</Button></div>
                <div className="project-search-filter-grid">
                    <Form.Group className="project-search-name-field" controlId="project-name-search"><Form.Label>Project name</Form.Label><div className="project-search-input-wrap"><Search size={17} aria-hidden="true" /><Form.Control placeholder="Search project names" value={projectName} onChange={e => setProjectName(e.target.value)} /></div></Form.Group>
                    <Form.Group controlId="project-id-search"><Form.Label>Inquiry ID</Form.Label><Form.Control placeholder="MIN or record ID" value={projectId} onChange={e => setProjectId(e.target.value)} /></Form.Group>
                    <Form.Group controlId="project-client-search"><Form.Label>Client</Form.Label><Form.Control placeholder="Client name" value={customerName} onChange={e => setCustomerName(e.target.value)} /></Form.Group>
                    <Form.Group controlId="project-sales-rep-search"><Form.Label>Sales representative</Form.Label><Form.Control placeholder="Representative name" value={salesRepName} onChange={e => setSalesRepName(e.target.value)} /></Form.Group>
                    <Form.Group><Form.Label id="project-stage-label">Workflow stage</Form.Label><Select inputId="project-stage" aria-labelledby="project-stage-label" options={statusOptions} value={statusOptions.find(option => option.value === status) || statusOptions[0]} onChange={option => setStatus(option?.value || '')} className="project-search-select" classNamePrefix="modern-select" /></Form.Group>
                    <Form.Group><Form.Label id="inquiry-type-label">Inquiry type</Form.Label><Select inputId="inquiry-type" aria-labelledby="inquiry-type-label" options={inquiryTypeOptions} value={inquiryTypeOptions.find(option => option.value === inquiryType)} onChange={option => setInquiryType(option?.value || '')} className="project-search-select" classNamePrefix="modern-select" /></Form.Group>
                    <Form.Group><Form.Label id="job-status-label">Record type</Form.Label><Select inputId="job-status" aria-labelledby="job-status-label" options={jobStatusOptions} value={jobStatusOptions.find(option => option.value === mjnStatus)} onChange={option => setMjnStatus(option?.value || '')} className="project-search-select" classNamePrefix="modern-select" /></Form.Group>
                </div>
            </Form>
            <div className="project-search-table-toolbar"><div><strong>Project directory</strong><span>{loading ? 'Updating results…' : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}</span></div><div className="project-search-toolbar-actions"><Button variant="outline-secondary" onClick={() => setColumnMode(mode => (mode + 1) % 3)} aria-label={`ID columns: ${columnModeLabels[columnMode]}. Change visible ID columns.`}>{columnModeLabels[columnMode]}</Button><Button variant="outline-primary" onClick={fetchRows} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</Button></div></div>
            <div className="project-search-results" aria-live="polite" aria-busy={loading}>
                {loadError && <div className="project-search-error" role="alert"><span>{loadError}</span><Button size="sm" variant="outline-danger" onClick={fetchRows}>Try again</Button></div>}
                <div className="project-search-table-scroll" tabIndex="0" aria-label="Projects table"><Table hover className="project-search-table mb-0">
                    <thead><tr>{columnMode !== 2 && <th className="project-search-col-inquiry" aria-sort={sortField === 'id' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" onClick={() => handleSort('id')}>Inquiry # <SortIcon field="id" /></button></th>}{columnMode !== 1 && <th className="project-search-col-job" aria-sort={sortField === 'jobNumber' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" onClick={() => handleSort('jobNumber')}>Job number <SortIcon field="jobNumber" /></button></th>}<th className="project-search-col-name">Project</th><th className="project-search-col-type">Inquiry type</th><th className="project-search-col-client">Client</th><th className="project-search-col-sales">Sales rep</th><th className="project-search-col-status">Status</th><th className="project-search-col-actions"><span className="visually-hidden">Actions</span></th></tr></thead>
                    <tbody>
                        {loading && [0, 1, 2].map(index => <tr className="project-search-skeleton" key={index} aria-hidden="true">{Array.from({ length: columnMode === 0 ? 8 : 7 }, (_, cell) => <td key={cell}><span /></td>)}</tr>)}
                        {!loading && !loadError && sortedRows.length === 0 && <tr className="project-search-empty"><td colSpan={columnMode === 0 ? 8 : 7}><BriefcaseBusiness size={30} aria-hidden="true" /><strong>No projects found</strong><span>{activeFilterCount ? 'Try clearing or adjusting the current filters.' : 'Project inquiries will appear here when they are created.'}</span>{activeFilterCount > 0 && <Button variant="outline-primary" onClick={clearFilters}>Clear filters</Button>}</td></tr>}
                        {!loading && sortedRows.map(row => { const type = row.inquiryType || 'JOB'; return <tr key={row.id}>
                            {columnMode !== 2 && <td data-label="Inquiry #" className="project-search-col-inquiry"><span className="project-search-id">{displayValue(row.id)}</span></td>}{columnMode !== 1 && <td data-label="Job number" className="project-search-col-job">{row.jobNumber ? <Badge bg="success">{row.jobNumber}</Badge> : <Badge bg="secondary">Inquiry only</Badge>}</td>}
                            <td data-label="Project" className="project-search-col-name"><strong>{displayValue(row.projectName)}</strong></td><td data-label="Inquiry type" className="project-search-col-type"><Badge bg={inquiryTypeBadge[type] || 'secondary'}>{inquiryTypeLabels[type] || displayValue(type)}</Badge></td><td data-label="Client" className="project-search-col-client">{displayValue(row.customerName)}</td><td data-label="Sales rep" className="project-search-col-sales">{displayValue(row.salesRepName)}</td><td data-label="Status" className="project-search-col-status"><span className={`project-search-status project-search-status--${displayValue(row.status, 'not-set').toLowerCase().replaceAll(' ', '-')}`}>{displayValue(row.status)}</span></td><td data-label="Action" className="project-search-col-actions"><Button size="sm" variant="outline-primary" onClick={() => navigate(`/projects/manage/${row.id}`)}>Manage</Button></td>
                        </tr>; })}
                    </tbody>
                </Table></div>
            </div>
        </section>
    </Container>;
}
export default ProjectSearch;
