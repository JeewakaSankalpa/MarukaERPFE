import React, { useEffect, useState } from "react";
import { Container, Button, Table, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

/* ========== INLINE API HELPERS ========== */
const listPendingTransfers = async (toLocationId) =>
    (await api.get(`/transfers?status=PENDING_ACCEPTANCE&toLocationId=${encodeURIComponent(toLocationId)}`)).data; // implement paging if needed
const acceptTransfer = async (id) => (await api.patch(`/transfers/${id}/accept`)).data;
const rejectTransfer = async (id) => (await api.patch(`/transfers/${id}/reject`)).data;

export default function TransfersInbox() {
    const [toLocationId, setToLocationId] = useState("LOC_PROJECT_OR_DEPT");
    const [rows, setRows] = useState([]);

    const load = async () => {
        try { setRows(await listPendingTransfers(toLocationId)); }
        catch { toast.error("Failed to load transfers"); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [toLocationId]);

    const onAccept = async (id) => { await acceptTransfer(id); toast.success("Accepted"); load(); };
    const onReject = async (id) => { await rejectTransfer(id); toast.info("Rejected"); load(); };

    return (
        <Container style={{ width:"80vw", maxWidth:1000, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize:"1.5rem" }}>Transfers Inbox</h2>
                    <input value={toLocationId} onChange={e=>setToLocationId(e.target.value)} className="form-control" style={{maxWidth:280}} />
                </div>

                <Table hover responsive>
                    <thead>
                    <tr><th>TR No</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                    {rows.map(r=>(
                        <tr key={r.id}>
                            <td>{r.trNumber}</td>
                            <td>{r.fromLocationId}</td>
                            <td>{r.toLocationId}</td>
                            <td>{(r.items||[]).map(i=>`${i.productNameSnapshot} x${i.qty}`).join(", ")}</td>
                            <td><Badge bg="warning">Pending</Badge></td>
                            <td className="d-flex gap-2">
                                <Button size="sm" onClick={()=>onAccept(r.id)}>Accept</Button>
                                <Button size="sm" variant="outline-danger" onClick={()=>onReject(r.id)}>Reject</Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
