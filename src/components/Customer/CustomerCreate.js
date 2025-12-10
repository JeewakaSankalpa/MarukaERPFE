import React, { useState, useEffect } from "react";
import { Form, Button, Container, Row } from "react-bootstrap";
import api from "../../api/api";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function CustomerCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  // const [id, setId] = useState("");
  // const [name, setName] = useState("");
  // const [mobileNumber, setMobileNumber] = useState("");
  // const [email, setEmail] = useState("");
  // const [taxId, setTaxId] = useState("");
  //   const [dateOfBirth, setDateOfBirth] = useState("");
  // const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(true);

  const [companyData, setCompanyData] = useState({
    comName: "",
    comAddress: "",
    comEmail: "",
    comContactNumber: "",
    businessRegNumber: "",
    currency: "",
    creditPeriod: "",
    vatType: "",
    vatNumber: "",
    contactPersonData: {
      name: "",
      contactNumber: "",
      email: "",
    },
    vatDocument: null, // Required
    businessRegDocument: null, // Optional
    documentURL: "",
    fileList: [], // URLs after save or load
    password: "", // Only for creation
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setCompanyData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
      // Clear error for nested field
      if (errors[`${parent}_${child}`]) {
        setErrors(prev => ({ ...prev, [`${parent}_${child}`]: null }));
      }
    } else {
      setCompanyData((prevData) => ({ ...prevData, [name]: value }));
      // Clear error for simple field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/customer/${id}`);
      const data = response.data;
      // Map response data to form state if needed, or use directly if matches
      setCompanyData(data);
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      // Fallback or alert
    }
  };

  // const handleFileChange = (e) => {
  //   const picked = Array.from(e.target.files || []);
  //   // Merge with existing selections; avoid duplicates by name+size
  //   const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`));
  //   const merged = [
  //     ...files,
  //     ...picked.filter((f) => !existingKeys.has(`${f.name}-${f.size}`)),
  //   ];
  //   setFiles(merged);
  // };

  const [errors, setErrors] = useState({});
  const [validated, setValidated] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    const mobileRegex = /^0\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!companyData.comName) newErrors.comName = "Company Name is required";
    if (!companyData.comAddress) newErrors.comAddress = "Company Address is required";

    if (!companyData.comEmail) {
      newErrors.comEmail = "Company Email is required";
    } else if (!emailRegex.test(companyData.comEmail)) {
      newErrors.comEmail = "Invalid email format";
    }

    if (!companyData.comContactNumber) {
      newErrors.comContactNumber = "Company Contact Number is required";
    } else if (!mobileRegex.test(companyData.comContactNumber)) {
      newErrors.comContactNumber = "Contact Number must be 10 digits and start with 0";
    }

    if (!companyData.businessRegNumber) newErrors.businessRegNumber = "BR Number is required";
    if (!companyData.currency) newErrors.currency = "Currency is required";
    if (!companyData.creditPeriod) newErrors.creditPeriod = "Credit Period is required";
    if (!companyData.contactPersonData.name) newErrors.contactPersonData_name = "Contact Person Name is required";

    if (!companyData.contactPersonData.contactNumber) {
      newErrors.contactPersonData_contactNumber = "Contact Person Mobile is required";
    } else if (!mobileRegex.test(companyData.contactPersonData.contactNumber)) {
      newErrors.contactPersonData_contactNumber = "Mobile Number must be 10 digits and start with 0";
    }

    if (!companyData.contactPersonData.email) {
      newErrors.contactPersonData_email = "Contact Person Email is required";
    } else if (!emailRegex.test(companyData.contactPersonData.email)) {
      newErrors.contactPersonData_email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidated(true);
    if (!validateForm()) return;

    const formData = new FormData();

    // Create a copy of companyData to sanitize for JSON payload
    const customerPayload = { ...companyData };
    // Remove file objects from the JSON payload as they are sent separately
    customerPayload.vatDocument = null;
    customerPayload.businessRegDocument = null;
    customerPayload.fileList = null; // Ensure this is not sending objects

    console.log("Sending Customer Payload:", customerPayload);

    // IMPORTANT: Send the JSON data as a Blob with type 'application/json'
    // This tells the backend to treat this part as the "customer" object
    const jsonBlob = new Blob([JSON.stringify(customerPayload)], { type: "application/json" });
    formData.append("customer", jsonBlob);

    // Append files if they exist
    if (companyData.vatDocument instanceof File) {
      formData.append("vatDocument", companyData.vatDocument);
    }
    if (companyData.businessRegDocument instanceof File) {
      formData.append("businessRegDocument", companyData.businessRegDocument);
    }

    // Append password for creation
    if (!isEditMode && companyData.password) {
      formData.append("password", companyData.password);
    }

    try {
      // IMPORTANT: Do NOT manually set Content-Type. Let the browser set it with the boundary.
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (isEditMode) {
        await api.put(`/customer/update/${id}`, formData, config);
      } else {
        await api.post("/customer/add", formData, config);
      }

      toast.success(isEditMode ? "Customer updated!" : "Customer saved!");
      setTimeout(() => {
        setShowForm(false);
        navigate("/customer/search");
      }, 1500);
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast.error(`Failed to save customer: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCancel = async () => {
    navigate("/customer/search");
  };

  return (
    <>
      {showForm ? (
        <Container
          className="my-5"
          style={{
            width: "100%",
            overflow: "auto",
            height: "calc(100vh - 10rem)",
          }}
        >

          <div className="bg-white shadow rounded p-4">
            <h2 className="text-center mb-4">{isEditMode ? "Edit Customer" : "Add Customer"}</h2>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="comName" className="mb-3">
                <Form.Label>Company Name</Form.Label>
                <Form.Control
                  type="text"
                  name="comName"
                  value={companyData.comName}
                  onChange={handleChange}
                  isInvalid={!!errors.comName}
                  isValid={validated && !errors.comName}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.comName}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="name" className="mb-3">
                <Form.Label>Company Address</Form.Label>
                <Form.Control
                  type="text"
                  name="comAddress"
                  value={companyData.comAddress}
                  onChange={handleChange}
                  isInvalid={!!errors.comAddress}
                  isValid={validated && !errors.comAddress}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.comAddress}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="address" className="mb-3">
                <Form.Label>Company Email</Form.Label>
                <Form.Control
                  type="email"
                  name="comEmail"
                  value={companyData.comEmail}
                  onChange={handleChange}
                  isInvalid={!!errors.comEmail}
                  isValid={validated && !errors.comEmail}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.comEmail}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="mobileNumber" className="mb-3">
                <Form.Label>Company Contact Number</Form.Label>
                <Form.Control
                  type="text"
                  name="comContactNumber"
                  value={companyData.comContactNumber}
                  onChange={handleChange}
                  isInvalid={!!errors.comContactNumber}
                  isValid={validated && !errors.comContactNumber}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.comContactNumber}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="email" className="mb-3">
                <Form.Label>Company Business Register Number</Form.Label>
                <Form.Control
                  type="text"
                  name="businessRegNumber"
                  value={companyData.businessRegNumber}
                  onChange={handleChange}
                  isInvalid={!!errors.businessRegNumber}
                  isValid={validated && !errors.businessRegNumber}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.businessRegNumber}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group controlId="taxType" className="mb-3">
                <Form.Label>Currency</Form.Label>
                <Form.Select
                  name="currency"
                  value={companyData.currency}
                  onChange={handleChange}
                  isInvalid={!!errors.currency}
                  isValid={validated && !errors.currency}
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="VAT">Rupees</option>
                  <option value="SVAT">USD</option>
                </Form.Select>
              </Form.Group>

              <Form.Group controlId="taxId" className="mb-3">
                <Form.Label>Credit Period (days)</Form.Label>
                <Form.Control
                  type="number"
                  name="creditPeriod"
                  value={companyData.creditPeriod}
                  onChange={handleChange}
                  isInvalid={!!errors.creditPeriod}
                  isValid={validated && !errors.creditPeriod}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.creditPeriod}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="taxId" className="mb-3">
                <Form.Label>Contact Person Name</Form.Label>
                <Form.Control
                  type="text"
                  name="contactPersonData.name"
                  value={companyData.contactPersonData.name}
                  onChange={handleChange}
                  isInvalid={!!errors.contactPersonData_name}
                  isValid={validated && !errors.contactPersonData_name}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.contactPersonData_name}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="taxId" className="mb-3">
                <Form.Label>Contact Person Mobile Number</Form.Label>
                <Form.Control
                  type="text"
                  name="contactPersonData.contactNumber"
                  value={companyData.contactPersonData.contactNumber}
                  onChange={handleChange}
                  isInvalid={!!errors.contactPersonData_contactNumber}
                  isValid={validated && !errors.contactPersonData_contactNumber}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.contactPersonData_contactNumber}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="taxId" className="mb-3">
                <Form.Label>Contact Person Email</Form.Label>
                <Form.Control
                  type="text"
                  name="contactPersonData.email"
                  value={companyData.contactPersonData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.contactPersonData_email}
                  isValid={validated && !errors.contactPersonData_email}
                  required
                />
                <Form.Control.Feedback type="invalid">{errors.contactPersonData_email}</Form.Control.Feedback>
              </Form.Group>

              {!isEditMode && (
                <Form.Group controlId="password" className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={companyData.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              )}

              <Row>
                <Form.Group controlId="taxType" className="mb-3">
                  <Form.Label>VAT Type</Form.Label>
                  <Form.Select
                    name="vatType"
                    value={companyData.vatType}

                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="VAT">VAT</option>
                    <option value="SVAT">SVAT</option>
                  </Form.Select>
                </Form.Group>

                {companyData.vatType && (
                  <Form.Group controlId="taxId" className="mb-3">
                    <Form.Label>{companyData.vatType} Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="vatNumber"
                      value={companyData.vatNumber}
                      onChange={handleChange}
                      placeholder={`Enter your ${companyData.vatType} number`}
                      required
                    />
                  </Form.Group>
                )}
              </Row>
              {/* <Form.Group controlId="document" className="mb-2">
              <Form.Label>Upload VAT Registration Document *</Form.Label>
              <Form.Control
                type="file"
                name="comName"
                accept=".pdf,.doc,.docx"
                value={companyData.comName}
                onChange={handleChange}
                multiple
                required
              />
            </Form.Group>
            <Form.Group controlId="document" className="mb-2">
              <Form.Label>Upload Registration Document (Optional)</Form.Label>
              <Form.Control
                type="file"
                name="comName"
                accept=".pdf,.doc,.docx"
                value={companyData.comName}
                onChange={handleChange}
                multiple
                required
              />
            </Form.Group> */}
              {/* VAT Document (Required) */}
              <Form.Group controlId="document" className="mb-2">
                <label>VAT Registration Document *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) =>
                    setCompanyData((prev) => ({
                      ...prev,
                      vatDocument: e.target.files[0],
                    }))
                  }
                  required
                />
              </Form.Group>
              {/* <label>VAT Registration Document *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.png"
              onChange={(e) =>
                setCompanyData((prev) => ({
                  ...prev,
                  vatDocument: e.target.files[0],
                }))
              }
              required
            /> */}
              {/* Business Registration Document (Optional) */}
              <Form.Group controlId="document" className="mb-2">
                <label>Business Registration Document (Optional)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) =>
                    setCompanyData((prev) => ({
                      ...prev,
                      businessRegDocument: e.target.files[0],
                    }))
                  }
                />
              </Form.Group>
              {/* <label>Business Registration Document (Optional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.png"
              onChange={(e) =>
                setCompanyData((prev) => ({
                  ...prev,
                  businessRegDocument: e.target.files[0],
                }))
              }
            /> */}
              <Button variant="primary" type="submit" className="me-2">
                Save
              </Button>
              <Button variant="secondary" type="cancel" onClick={handleCancel}>
                Cancel
              </Button>
            </Form>
          </div>
        </Container>
      ) : (
        <p>Customer saved. You may proceed with other actions.</p>
      )}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </>
  );
}

export default CustomerCreate;
