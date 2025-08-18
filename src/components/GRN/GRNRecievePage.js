import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Row, Col, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

/* ========== INLINE API HELPERS ========== */
const qp = (o={}) => { const u=new URLSearchParams(); Object.entries(o).forEach(([k,v])=> (v||v===0)&&v!==""&&u.set(k,v)); return u.toString(); };
const getPO = async (id) => (await api.get(`/pos/${id}`)).data;
const createGRN = async (payload) => (await api.post(`/grns`, payload)).data;

export default function GRNReceivePage({ poId: initialPoId }) {
    const [poId, setPoId] = useState(initialPoId || "");
    const [po, setPo] = useState(null);
    const [locationId, setLocationId] = useState("LOC_STORES_MAIN");
    const [rows, setRows] = useState([]); // {productId, receivedQty, unitCost, batches:[{batchNo,expiryDate,qty}], serials:[]}

    useEffect(() => {
        (async () => {
            if (!poId) { setPo(null); setRows([]); return; }
            try {
                const d = await getPO(poId);
                setPo(d);
                setRows((d.items||[]).map(it => ({
                    productId: it.productId,
                    productName: it.productName,
                    sku: it.sku,
                    unit: it.unit || "pcs",
                    orderedQty: it.orderedQty,
                    receivedQty: 0,
                    unitCost: "",
                    batches: [],
                    serials: []
                })));
            } catch { toast.error("Failed to load PO"); }
        })();
    }, [poId]);

    const setField = (i, k, v) => setRows(rs => { const cp=[...rs]; cp[i] = { ...cp[i], [k]: v }; return cp; });
    const addBatch = (i) => setRows(rs => { const cp=[...rs]; (cp[i].batches ||= []).push({ batchNo:"", expiryDate:"", qty:"" }); return cp; });
    const setBatch = (i, bi, k, v) => setRows(rs => { const cp=[...rs]; const bs=[...(cp[i].batches||[])]; bs[bi]={ ...bs[bi], [k]: v }; cp[i].batches=bs; return cp; });
    const rmBatch = (i, bi) => setRows(rs => { const cp=[...rs]; cp[i].batches = (cp[i].batches||[]).filter((_,idx)=>idx!==bi); return cp; });

    const save = async () => {
        try {
            if (!po?.id) { toast.warn("Select a PO"); return; }
            const items = rows.filter(r => Number(r.receivedQty) > 0).map(r => ({
                productId: r.productId,
                unit: r.unit,
                receivedQty: Number(r.receivedQty),
                unitCost: r.unitCost ? String(r.unitCost) : undefined,
                batches: (r.batches||[]).filter(b=>Number(b.qty)>0).map(b=>({
                    batchNo: b.batchNo || undefined,
                    expiryDate: b.expiryDate || undefined,
                    qty: Number(b.qty)
                })),
                serials: (r.serials||[]).filter(s=>s && s.trim())
            }));
            if (items.length === 0) { toast.info("Enter received quantities"); return; }
            const res = await createGRN({ poId: po.id, locationId, items });
            toast.success(`GRN ${res.grnNumber} posted`);
            setPoId(""); setPo(null); setRows([]);
        } catch (e) { toast.error(e?.response?.data?.message || "Failed to post GRN"); }
    };

    return (
        <Container style={{ width:"80vw", maxWidth:1100, paddingTop:24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize:"1.5rem" }}>Receive (GRN)</h2>
                    <div className="d-flex gap-2">
                        <Form.Control placeholder="PO ID" value={poId} onChange={e=>setPoId(e.target.value)} style={{maxWidth:280}} />
                        <Button variant="outline-secondary" onClick={()=>setPoId(poId)}>Load</Button>
                    </div>
                </div>

                <Row className="g-3 mb-3">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label>Receive to Location</Form.Label>
                            <Form.Control value={locationId} onChange={e=>setLocationId(e.target.value)} />
                        </Form.Group>
                    </Col>
                    <Col md={8}>
                        {po && (
                            <div className="d-flex gap-3 align-items-center mt-4 mt-md-0">
                                <Badge bg="light" text="dark">PO: {po.poNumber}</Badge>
                                <Badge bg="light" text="dark">Supplier: {po.supplierName}</Badge>
                                <Badge bg={po.status==="FULLY_RECEIVED"?"success":po.status==="PARTIALLY_RECEIVED"?"info":"secondary"}>{po.status}</Badge>
                            </div>
                        )}
                    </Col>
                </Row>

                {!po ? <div className="text-muted">Enter and load a PO to proceed.</div> :
                    <>
                        <Table hover responsive>
                            <thead>
                            <tr>
                                <th>Product</th><th>SKU</th><th className="text-end">Ordered</th>
                                <th style={{width:140}}>Receive Qty</th><th style={{width:130}}>Unit Cost</th><th>Batches / Serials</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.productId}>
                                    <td>{r.productName}</td>
                                    <td>{r.sku}</td>
                                    <td className="text-end">{r.orderedQty}</td>
                                    <td>
                                        <Form.Control type="number" min="0" value={r.receivedQty} onChange={e=>setField(i,"receivedQty",e.target.value)} />
                                    </td>
                                    <td>
                                        <Form.Control value={r.unitCost} onChange={e=>setField(i,"unitCost",e.target.value)} />
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column gap-2">
                                            {(r.batches||[]).map((b,bi)=>(
                                                <div key={bi} className="d-flex gap-2">
                                                    <Form.Control placeholder="Batch No" value={b.batchNo} onChange={e=>setBatch(i,bi,"batchNo",e.target.value)} style={{maxWidth:140}}/>
                                                    <Form.Control type="date" value={b.expiryDate} onChange={e=>setBatch(i,bi,"expiryDate",e.target.value)} style={{maxWidth:160}}/>
                                                    <Form.Control type="number" min="0" placeholder="Qty" value={b.qty} onChange={e=>setBatch(i,bi,"qty",e.target.value)} style={{maxWidth:100}}/>
                                                    <Button size="sm" variant="outline-danger" onClick={()=>rmBatch(i,bi)}>✕</Button>
                                                </div>
                                            ))}
                                            <div className="d-flex gap-2">
                                                <Button size="sm" variant="outline-secondary" onClick={()=>addBatch(i)}>+ Batch</Button>
                                                <Form.Control placeholder="Serials (comma separated)" value={(r.serials||[]).join(",")}
                                                              onChange={e=>setField(i,"serials", e.target.value.split(",").map(s=>s.trim()))}/>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>

                        <Button className="w-100 mt-2" onClick={save}>Post GRN</Button>
                    </>}
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
