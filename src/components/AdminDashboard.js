import React, { useEffect, useState } from "react";
import { Row, Col, Card, Spinner, Table, Badge } from "react-bootstrap";
import api from "../api/api";


const money = (n) => Number(n || 0).toLocaleString();

function FlipCard({ front, back }) {
    const [flipped, setFlipped] = useState(false);
    return (
        <div className={`flip-wrapper ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(f => !f)} style={{ cursor: "pointer" }}>
            <div className="flip-inner">
                <div className="flip-face flip-front">{front}</div>
                <div className="flip-face flip-back">{back}</div>
            </div>
            <style>{`
        .flip-wrapper { perspective: 1000px; }
        .flip-inner { position: relative; width: 100%; height: 100%; transition: transform .6s; transform-style: preserve-3d; }
        .flip-wrapper.flipped .flip-inner { transform: rotateY(180deg); }
        .flip-face { position: absolute; inset: 0; backface-visibility: hidden; }
        .flip-back { transform: rotateY(180deg); }
      `}</style>
        </div>
    );
}

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get("/dashboard/summary");
            setData(res.data);
        } catch (e) {
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading && !data) {
        return <div className="p-3"><Spinner size="sm" className="me-2" /> Loading dashboard…</div>;
    }

    const proj = data?.project;
    const due = data?.due;
    const acc = data?.accounts;

    const DueList = ({ list }) => (
        <Table size="sm" bordered responsive className="mb-0">
            <thead>
                <tr><th style={{ width: 140 }}>ID</th><th>Name</th><th style={{ width: 180 }}>Due</th></tr>
            </thead>
            <tbody>
                {(!list || list.length === 0) ? (
                    <tr><td colSpan={3} className="text-muted text-center">None</td></tr>
                ) : list.map(x => (
                    <tr key={x.id}>
                        <td><Badge bg="secondary">{x.id}</Badge></td>
                        <td className="text-truncate">{x.name || "-"}</td>
                        <td>{x.dueAt ? new Date(x.dueAt).toLocaleString() : "-"}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div className="p-2" style={{ width: "100%" }}>
            <Row className="g-3">
                {/* Project Stats */}
                <Col lg={4} md={6}>
                    <Card className="h-100">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                <a href="#/admin/config" className="text-decoration-none small">
                                    ⚙ Config
                                </a>
                                <span role="button" className="text-muted small" onClick={load}>{loading ? "…" : "Reload"}</span>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            {!proj ? (
                                <div className="text-muted">No data</div>
                            ) : (
                                <>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Total Ongoing</div>
                                        <div><strong>{proj.totalOngoing}</strong></div>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Total Completed</div>
                                        <div><strong>{proj.totalCompleted}</strong></div>
                                    </div>
                                    <hr />
                                    <div className="fw-semibold mb-2">By Status</div>
                                    <Table size="sm" bordered responsive className="mb-0">
                                        <tbody>
                                            {Object.entries(proj.byStatus || {}).map(([k, v]) => (
                                                <tr key={k}><td>{k}</td><td className="text-end">{v}</td></tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Due Dates (flip) */}
                <Col lg={4} md={6}>
                    <Card className="h-100">
                        <Card.Header>Project Due Dates (click to flip)</Card.Header>
                        <Card.Body style={{ position: "relative", minHeight: 260 }}>
                            {!due ? (
                                <div className="text-muted">No data</div>
                            ) : (
                                <FlipCard
                                    front={
                                        <div className="p-1">
                                            <div className="d-flex justify-content-between mb-2">
                                                <div>Due Today</div><div><strong>{due.dueTodayCount}</strong></div>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <div>Due This Week</div><div><strong>{due.dueThisWeekCount}</strong></div>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <div>Due This Month</div><div><strong>{due.dueThisMonthCount}</strong></div>
                                            </div>
                                            <div className="text-muted small mt-3">Flip to view project IDs & names</div>
                                        </div>
                                    }
                                    back={
                                        <div className="p-1">
                                            <div className="fw-semibold mb-1">Due Today</div>
                                            <DueList list={due.dueToday} />
                                            <div className="fw-semibold mt-3 mb-1">Due This Week</div>
                                            <DueList list={due.dueThisWeek} />
                                            <div className="fw-semibold mt-3 mb-1">Due This Month</div>
                                            <DueList list={due.dueThisMonth} />
                                        </div>
                                    }
                                />
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Accounts */}
                <Col lg={4} md={12}>
                    <Card className="h-100">
                        <Card.Header>Accounts</Card.Header>
                        <Card.Body>
                            {!acc ? (
                                <div className="text-muted">No data</div>
                            ) : (
                                <>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Outstanding (to collect)</div>
                                        <div><strong>₹ {money(acc.outstanding)}</strong></div>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <div>Payments Received This Week</div>
                                        <div><strong>₹ {money(acc.receivedThisWeek)}</strong></div>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <div>Payments Received This Month</div>
                                        <div><strong>₹ {money(acc.receivedThisMonth)}</strong></div>
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
