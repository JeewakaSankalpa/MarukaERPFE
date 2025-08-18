import React, { useEffect, useState } from "react";
import { Container, Row, Col, Form, Table, Button } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

export default function ProjectHoldingsPage() {
    const [projectId, setProjectId] = useState("");
    const [rows, setRows] = useState([]); // [{productId, quantity}]
    const [returnQty, setReturnQty] = useState({}); // productId -> qty

    const load = async (pid) => {
        if (!pid) { setRows([]); return; }
        try {
            const data = (await api.get(`/inventory/project-holdings`, { params: { projectId: pid } })).data;
            setRows(data);
            setReturnQty(Object.fromEntries(data.map(d=>[d.productId,0])));
        } catch {
            toast.error("Failed to load holdings");
        }
    };

    const doReturn = async () => {
        const lines = Object.entries(returnQty)
            .map(([productId, qty]) => ({ productId, qty: Number(qty||0) }))
            .filter(l => l.qty > 0);
        if (!projectId || lines.length===0) { toast.info("Enter returns"); return; }
        try {
            await api.post(`/inventory/project-returns`, { projectId, lines });
            toast.success("Returned to Main Store");
            await load(projectId);
        } catch {
            toast.error("Failed to return");
        }
    };

    useEffect(() => { /* noop */ }, []);

    return (
        <Container style={{ width: "80vw", maxWidth: 1000, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-3">
                <Row className="g-3 align-items-end mb-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label>Project ID</Form.Label>
                            <Form.Control value={projectId} onChange={e=>setProjectId(e.target.value)} placeholder="Enter Project ID"/>
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Button onClick={()=>load(projectId)}>Load</Button>
                    </Col>
                </Row>

                <Table hover responsive>
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th className="text-end">On Project</th>
                        <th style={{width:160}}>Return Qty</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map(r=>{
                        const maxR = r.quantity || 0;
                        return (
                            <tr key={r.productId}>
                                <td>{r.productId}</td>
                                <td className="text-end">{r.quantity}</td>
                                <td>
                                    <Form.Control type="number" min="0" max={maxR}
                                                  value={returnQty[r.productId] ?? 0}
                                                  onChange={e=>{
                                                      const v = Math.max(0, Math.min(maxR, Number(e.target.value||0)));
                                                      setReturnQty(s=>({ ...s, [r.productId]: v }));
                                                  }}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-end">
                    <Button variant="success" onClick={doReturn}>Return to Main Store</Button>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
