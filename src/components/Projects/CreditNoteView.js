import React, { useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import logo from "../../assets/logo.jpeg";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const date = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "-";
const taxInvoiceNumber = (value) => {
    const raw = String(value || "");
    if (raw.startsWith("MT/INV/")) return raw;
    const suffix = raw.match(/(\d+)\s*$/)?.[1];
    return suffix ? `MT/INV/${suffix}` : raw;
};

export default function CreditNoteView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [creditNote, setCreditNote] = useState(null);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get(`/invoices/${id}/credit-note`),
            api.get("/admin/config").catch(() => ({ data: {} })),
        ]).then(([creditNoteResponse, settingsResponse]) => {
            setCreditNote(creditNoteResponse.data);
            setSettings(settingsResponse.data || {});
        }).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!creditNote) return <div className="text-center p-5">Credit Note not found.</div>;

    return (
        <main className="bg-light min-vh-100 p-4">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm; }
                    body * { visibility: hidden; }
                    .credit-note-sheet, .credit-note-sheet * { visibility: visible; }
                    .credit-note-sheet { position: absolute; inset: 0; box-shadow: none !important; }
                    .no-print { display: none !important; }
                }
                .credit-note-sheet { max-width: 820px; min-height: 1040px; margin: 0 auto; background: #fff; padding: 42px; color: #111; box-shadow: 0 10px 32px rgba(15,23,42,.12); font-family: Arial, sans-serif; }
                .cn-header { display: flex; justify-content: space-between; gap: 32px; border-bottom: 8px solid #3f929b; padding-bottom: 24px; }
                .cn-logo { width: 210px; max-height: 90px; object-fit: contain; }
                .cn-title { font-size: 30px; font-weight: 800; color: #3f929b; }
                .cn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin: 34px 0; }
                .cn-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .cn-value { margin: 4px 0 14px; white-space: pre-line; }
                .cn-summary { width: 360px; margin: 44px 0 0 auto; }
                .cn-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; }
                .cn-total { background: #3f929b; color: #fff; font-size: 18px; font-weight: 800; padding: 12px; }
                .cn-signatures { display: grid; grid-template-columns: repeat(3,1fr); gap: 42px; margin-top: 120px; }
                .cn-signatures div { border-top: 1px solid #111; padding-top: 7px; text-align: center; }
            `}</style>
            <div className="no-print d-flex justify-content-between mb-3 mx-auto" style={{ maxWidth: 820 }}>
                <Button variant="secondary" onClick={() => navigate(`/invoices/${id}?type=tax`)}>Back to invoice</Button>
                <Button variant="primary" onClick={() => window.print()}>Print / Save PDF</Button>
            </div>
            <section className="credit-note-sheet">
                <header className="cn-header">
                    <div>
                        <div className="fw-bold">{settings["app.company.name"] || "Maruka Technologies"}</div>
                        <div>{settings["app.company.address"] || ""}</div>
                        <div>{settings["app.company.phone"] || ""}</div>
                        <div>{settings["app.company.email"] || ""}</div>
                        <div>{settings["app.company.vatNo"] || settings["app.company.vat"] || ""}</div>
                    </div>
                    <img src={logo} className="cn-logo" alt="Maruka Technologies" />
                </header>
                <div className="cn-grid">
                    <div>
                        <div className="cn-title">CREDIT NOTE</div>
                        <div className="cn-label mt-3">Credit Note No.</div>
                        <div className="cn-value fw-bold">{creditNote.creditNoteNumber}</div>
                        <div className="cn-label">Date</div>
                        <div className="cn-value">{date(creditNote.issuedDate)}</div>
                        <div className="cn-label">Against Tax Invoice</div>
                        <div className="cn-value fw-bold">{taxInvoiceNumber(creditNote.taxInvoiceNumber)}</div>
                    </div>
                    <div>
                        <div className="cn-label">Credit To</div>
                        <div className="cn-value fw-bold">{creditNote.customerNameSnapshot || "-"}</div>
                        <div className="cn-value">{creditNote.customerAddressSnapshot || ""}</div>
                        <div className="cn-value">{creditNote.customerPhoneSnapshot || ""}</div>
                        <div className="cn-value">{creditNote.customerEmailSnapshot || ""}</div>
                    </div>
                </div>
                <div className="border rounded p-3">
                    <div className="cn-label">Reason for full cancellation</div>
                    <div className="mt-2">{creditNote.reason}</div>
                </div>
                <div className="cn-summary">
                    <div className="cn-row"><span>Subtotal</span><span>LKR {money(creditNote.subtotal)}</span></div>
                    <div className="cn-row"><span>Other tax</span><span>LKR {money(creditNote.taxAmount)}</span></div>
                    <div className="cn-row"><span>VAT</span><span>LKR {money(creditNote.vatAmount)}</span></div>
                    <div className="cn-row cn-total"><span>Total credit</span><span>LKR {money(creditNote.totalAmount)}</span></div>
                </div>
                <div className="small text-muted mt-4">
                    Full Credit Note issued against the Tax Invoice above. Approved by {creditNote.approvedBy || "MD"} on {date(creditNote.approvedAt)}.
                </div>
                <div className="cn-signatures">
                    <div>Prepared By</div>
                    <div>Checked By</div>
                    <div>Authorized By</div>
                </div>
            </section>
        </main>
    );
}
