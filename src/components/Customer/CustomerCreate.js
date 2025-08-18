import React, { useState } from "react";
import { Form, Button, Container, Row } from "react-bootstrap";
import api from "../../services/api";
import { Navigate, useNavigate } from "react-router-dom";

function CustomerCreate() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData((prevData) => ({ ...prevData, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    // const customerData = { name, mobileNumber, email, address };

    try {
      await api.post("/customer/create", companyData);
      alert("Customer saved successfully!");
      setShowForm(false); // Hide the form after saving
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
    navigate("/customer/search");
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
          <h2 className="text-center mb-4">Add Customer</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="comName" className="mb-3">
              <Form.Label>Company Name</Form.Label>
              <Form.Control
                type="text"
                name="comNamecomName"
                value={companyData.comName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label>Company Address</Form.Label>
              <Form.Control
                type="text"
                name="comAddress"
                value={companyData.comAddress}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="address" className="mb-3">
              <Form.Label>Company Email</Form.Label>
              <Form.Control
                type="email"
                name="comEmail"
                value={companyData.comEmail}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="mobileNumber" className="mb-3">
              <Form.Label>Company Contact Number</Form.Label>
              <Form.Control
                type="text"
                name="comContactNumber"
                value={companyData.comContactNumber}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="email" className="mb-3">
              <Form.Label>Company Business Register Number</Form.Label>
              <Form.Control
                type="email"
                name="businessRegNumber"
                value={companyData.businessRegNumber}
                onChange={handleChange}
                required
              />
            </Form.Group>
            
            <Form.Group controlId="taxType" className="mb-3">
              <Form.Label>Currency</Form.Label>
              <Form.Select
              name="currency"
                value={companyData.currency}
                onChange={handleChange}
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
                required
              />
            </Form.Group>
            <Form.Group controlId="taxId" className="mb-3">
              <Form.Label>Contact Person Name</Form.Label>
              <Form.Control
                type="text"
                name="contactPersonData.name"
                value={companyData.contactPersonData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="taxId" className="mb-3">
              <Form.Label>Contact Person Mobile Number</Form.Label>
              <Form.Control
                type="text"
                name="contactNumber"
                value={companyData.contactPersonData.contactNumber}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="taxId" className="mb-3">
              <Form.Label>Contact Person Email</Form.Label>
              <Form.Control
                type="text"
                name="email"
                value={companyData.contactPersonData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

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
        </Container>
      ) : (
        <p>Customer saved. You may proceed with other actions.</p>
      )}
    </>
  );
}

export default CustomerCreate;
