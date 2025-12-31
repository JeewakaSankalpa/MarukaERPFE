import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Badge, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaBoxes, FaExclamationTriangle, FaBoxOpen, FaClipboardList, FaArrowRight, FaPlus } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from "../../api/api";
import MenuCard from "../ReusableComponents/MenuCard";

const StatCard = ({ title, value, icon, color, subtext }) => (
  <Card className="h-100 shadow-sm border-0">
    <Card.Body className="d-flex align-items-center justify-content-between">
      <div>
        <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{title}</h6>
        <h2 className="mb-0 fw-bold">{value}</h2>
        {subtext && <small className="text-muted">{subtext}</small>}
      </div>
      <div className={`p-3 rounded-circle bg-${color} bg-opacity-10 text-${color}`}>
        {icon}
      </div>
    </Card.Body>
  </Card>
);

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/inventory/dashboard-stats');
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load stats", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  };

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" variant="primary" />
    </Container>
  );

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Inventory Overview</h2>
        <div className="d-flex gap-2">

          <Button variant="outline-primary" onClick={() => navigate('/item/add')} className="d-flex align-items-center gap-2">
            <FaBoxes /> New Item
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <StatCard
            title="Total Value"
            value={`Rs. ${(stats?.totalInventoryValue || 0).toLocaleString()}`}
            icon={<FaClipboardList size={24} />}
            color="primary"
            subtext="Across all locations"
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Unique Items"
            value={stats?.totalUniqueItems || 0}
            icon={<FaBoxOpen size={24} />}
            color="info"
            subtext="With positive stock"
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Low Stock Alerts"
            value={stats?.lowStockCount || 0}
            icon={<FaExclamationTriangle size={24} />}
            color="danger"
            subtext="Items below reorder level"
          />
        </Col>
      </Row>

      {/* Charts Section */}
      <Row className="g-4 mb-4">
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 py-3">
              <h6 className="mb-0 fw-bold">Items Usage Trend (Last 6 Months)</h6>
            </Card.Header>
            <Card.Body style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.globalUsageTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" name="Items Issued" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 py-3">
              <h6 className="mb-0 fw-bold">Top Moved Items</h6>
            </Card.Header>
            <Card.Body style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stats?.topMovedItems || []}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="productName"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip />
                  <Bar dataKey="totalOut" name="Qty Out" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Low Stock Table */}
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold text-danger">Low Stock Alerts</h5>
              {stats?.lowStockCount > 5 && (
                <Button variant="link" size="sm" onClick={() => navigate('/inventory/view')}>View All</Button>
              )}
            </Card.Header>
            <Card.Body className="p-0">
              {stats?.lowStockItems?.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaClipboardList size={48} className="mb-3 opacity-25" />
                  <p>No low stock items found. Great job!</p>
                </div>
              ) : (
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light text-muted">
                    <tr>
                      <th className="ps-4">Product Name</th>
                      <th className="text-center">Current Qty</th>
                      <th className="text-center">Reorder Level</th>
                      <th className="text-end pe-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.lowStockItems || []).slice(0, 5).map((item) => (
                      <tr key={item.productId}>
                        <td className="ps-4 fw-medium">{item.productName}</td>
                        <td className="text-center fw-bold">{item.currentQty}</td>
                        <td className="text-center text-muted">{item.reorderLevel}</td>
                        <td className="text-end pe-4">
                          <Badge bg="danger" className="px-2 py-1">Critical</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions / Menu */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white border-bottom-0 py-3">
              <h5 className="mb-0 fw-bold">Quick Actions</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              <Button variant="light" className="d-flex align-items-center justify-content-between p-3 border" onClick={() => navigate('/inventory/view')}>
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
                    <FaClipboardList />
                  </div>
                  <div className="text-start">
                    <div className="fw-bold">View Inventory</div>
                    <small className="text-muted">Search and filter all items</small>
                  </div>
                </div>
                <FaArrowRight className="text-muted" />
              </Button>

              <Button variant="light" className="d-flex align-items-center justify-content-between p-3 border" onClick={() => navigate('/employee/view')}>
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-success bg-opacity-10 p-2 rounded text-success">
                    <FaBoxes />
                  </div>
                  <div className="text-start">
                    <div className="fw-bold">Allocate to Project</div>
                    <small className="text-muted">Issue stock to sites</small>
                  </div>
                </div>
                <FaArrowRight className="text-muted" />
              </Button>

              <Button variant="light" className="d-flex align-items-center justify-content-between p-3 border" onClick={() => navigate('/inventory/reports')}>
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-warning bg-opacity-10 p-2 rounded text-warning">
                    <FaClipboardList />
                  </div>
                  <div className="text-start">
                    <div className="fw-bold">Reports</div>
                    <small className="text-muted">Generate PDF reports</small>
                  </div>
                </div>
                <FaArrowRight className="text-muted" />
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default InventoryDashboard;
