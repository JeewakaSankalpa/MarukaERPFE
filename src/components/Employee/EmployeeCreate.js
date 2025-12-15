import React, { useEffect, useState } from "react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";
import api from "../../api/api";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

function EmployeeCreate({ mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = mode === "edit";

  // State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    address: "",
    nicNumber: "",
    role: "EMPLOYEE",
    moduleAccess: [],
    userName: "",
    password: "",
    departmentId: "",
    reportsToEmployeeId: "",
    designation: "",
    epfNo: "",
    basicSalary: "",
    joinDate: new Date().toISOString().split('T')[0]
  });

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoPassword, setAutoPassword] = useState("");

  // Fetch Dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const deptRes = await api.get("/departments");
        setDepartments(deptRes.data?.content || []); // Assuming Page response

        const empRes = await api.get("/employee/all");
        // Filter only Managers/Admins/HR for reporting
        const allEmps = empRes.data || [];
        const mgrs = allEmps.filter(e => ["MANAGER", "ADMIN", "HR"].includes(e.role));
        setManagers(mgrs);
      } catch (e) {
        console.error("Failed to load dropdowns", e);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch Data if Edit
  useEffect(() => {
    if (isEditMode && id) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/employee/${id}`);
          if (res.data) {
            const d = res.data;
            // Flat map for form
            setFormData({
              firstName: d.firstName || "",
              lastName: d.lastName || "",
              email: d.email || "",
              contactNumber: d.contactNumber || "",
              address: d.address || "",
              nicNumber: d.nicNumber || "",
              role: d.role || "EMPLOYEE",
              moduleAccess: d.moduleAccess || [],
              userName: d.username || "",
              password: "", // Don't show password on edit
              departmentId: d.departmentId || d.Department?.id || "",
              reportsToEmployeeId: d.reportsToEmployeeId || "",
              designation: d.designation || "",
              epfNo: d.epfNo || "",
              basicSalary: d.basicSalary || "",
              joinDate: d.joinDate || ""
            });
          }
        } catch (error) {
          toast.error("Failed to load employee data");
        }
      };
      fetchData();
    }
  }, [isEditMode, id]);

  // Auto-generate password logic
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAutoPassword(pass);
    setFormData(prev => ({ ...prev, password: pass }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };
      if (!payload.password && !isEditMode) {
        toast.error("Password is required for new employees");
        setLoading(false);
        return;
      }

      // 1. Auth Registration (Only for Create)
      if (!isEditMode) {
        const authPayload = {
          username: payload.userName, // Note: backend expects 'username'
          password: payload.password,
          role: payload.role,
          userType: "EMPLOYEE" // Mapped to backend UserType enum
        };
        try {
          await api.post("/auth/register", authPayload);
        } catch (authErr) {
          // If auth fails (e.g. username exists), stop here
          toast.error(authErr.response?.data || "Authentication registration failed");
          setLoading(false);
          return;
        }
      }

      // 2. Employee Profile Creation/Update
      // Map frontend keys to backend expected DTO if needed.
      // Backend expects: username, password (again, will be encoded again), etc.
      const employeePayload = {
        ...payload,
        username: payload.userName // Map 'userName' to 'username'
      };

      const creatorRole = localStorage.getItem("role") || "ADMIN"; // Current user's role

      if (!isEditMode) {
        await api.post(`/employee/register?creatorRole=${creatorRole}`, employeePayload);
        toast.success("Employee created and credentials emailed!");
        navigate("/employee/list"); // We will build this next
      } else {
        await api.post(`/employee/${id}`, employeePayload); // Using POST/PUT mapped endpoint
        toast.success("Employee updated successfully");
        navigate("/employee/list");
      }

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="my-5">
      <h2 className="text-center mb-4">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h2>
      <Form onSubmit={handleSubmit} className="p-4 border rounded shadow-sm bg-light">
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control name="firstName" value={formData.firstName} onChange={handleChange} required />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control name="lastName" value={formData.lastName} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Email (Credentials will be sent here)</Form.Label>
              <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Address</Form.Label>
          <Form.Control name="address" value={formData.address} onChange={handleChange} />
        </Form.Group>

        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>NIC Number</Form.Label>
              <Form.Control name="nicNumber" value={formData.nicNumber} onChange={handleChange} />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Designation</Form.Label>
              <Form.Control name="designation" value={formData.designation} onChange={handleChange} />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Join Date</Form.Label>
              <Form.Control type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>

        <hr />
        <h5>Organizational</h5>
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Select name="departmentId" value={formData.departmentId} onChange={handleChange}>
                <option value="">-- Select --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Reports To</Form.Label>
              <Form.Select name="reportsToEmployeeId" value={formData.reportsToEmployeeId} onChange={handleChange}>
                <option value="">-- Select Manager --</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.designation})</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select name="role" value={formData.role} onChange={handleChange}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="ADMIN">Admin</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Module Access */}
        <div className="mb-3">
          <Form.Label>Module Access (For finer granular control)</Form.Label>
          <div className="d-flex flex-wrap gap-3">
            {["ATTENDANCE", "LEAVE_MANAGEMENT", "PAYROLL", "HR", "INVENTORY", "SALES", "PROJECTS", "CUSTOMERS", "DASHBOARD", "EMPLOYEES"].map(mod => (
              <Form.Check
                key={mod}
                type="checkbox"
                label={mod}
                checked={formData.moduleAccess && formData.moduleAccess.includes(mod)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData(prev => {
                    const current = prev.moduleAccess || [];
                    return {
                      ...prev,
                      moduleAccess: checked
                        ? [...current, mod]
                        : current.filter(m => m !== mod)
                    };
                  });
                }}
              />
            ))}
          </div>
        </div>

        <hr />
        <h5>Payroll</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Basic Salary</Form.Label>
              <Form.Control type="number" name="basicSalary" value={formData.basicSalary} onChange={handleChange} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>EPF Number</Form.Label>
              <Form.Control name="epfNo" value={formData.epfNo} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>

        <hr />
        <h5>Login Credentials</h5>
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control name="userName" value={formData.userName} onChange={handleChange} required disabled={isEditMode} />
        </Form.Group>

        {!isEditMode && (
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter or Generate"
              />
              <Button variant="outline-secondary" onClick={generatePassword}>Generate</Button>
            </div>
            {autoPassword && <Form.Text className="text-success">Generated: {autoPassword}</Form.Text>}
          </Form.Group>
        )}

        <div className="d-flex gap-2 justify-content-end mt-4">
          <Button variant="secondary" onClick={() => navigate("/employee/list")}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Employee"}</Button>
        </div>
      </Form>
    </Container>
  );
}

export default EmployeeCreate;
