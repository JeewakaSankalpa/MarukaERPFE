import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { Form, Button, Container, Table, Row, Col, Modal } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../api/api';
import DatePicker from 'react-datepicker';
import { useParams } from "react-router-dom";

function SupplierReturn() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [invoiceDetails, setInvoiceDetails] = useState({
        invoiceNo: '',
        date: new Date().toISOString().slice(0, 10),
        poNo: '',
        status: '',
        analysis: 'Purchase',
        supplierId: '',
        supplierName: '',
        locationId: localStorage.getItem('store') || '',
        createdBy: localStorage.getItem('firstName') || '',
    });

    const [products, setProducts] = useState([]);
    const [currentProduct, setCurrentProduct] = useState({
        productId: '',
        batchNumber: '',
        name: '',
        quantity: '',
        free: '',
        costPrice: '',
        discount: '',
        unit: '',
        retailPrice: '',
        wholesalePrice: '',
        expiryDate: '',
        returnedQuantity: 0,
    });

    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');

    useEffect(() => {
        fetchFetchInvoiceDetails();
        generateReturnInvoiceNumber();
    }, []);

    const fetchFetchInvoiceDetails = async () => {
        try {
            const response = await api.get(`/inventory/supplier-invoice/${id}`);
            const invoiceData = response.data;
            setInvoiceDetails(invoiceData);
            setProducts(invoiceData.products.map(product => ({
                ...product,
                quantity: product.quantity - (product.returnedQuantity || 0),
            })));
            setSupplierInvoiceNumber(invoiceData.invoiceNo);
        } catch (error) {
            console.error('Failed to fetch supplier invoice:', error);
        }
    };

    const [returnInvoiceNumber, setReturnInvoiceNumber] = useState();

    const generateReturnInvoiceNumber = () => {
        const date = new Date();
        const day = date.toISOString().slice(0, 10);
        setReturnInvoiceNumber(`${supplierInvoiceNumber}-RE-${day}`);
    };

    const [returnQuantities, setReturnQuantities] = useState(
        products.map(() => 0)
    );

    const handleQuantityChange = (index, value) => {
        const updatedQuantities = [...returnQuantities];
        updatedQuantities[index] = value;
        setReturnQuantities(updatedQuantities);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const productEntries = products.map((product, index) => ({
                productId: product.productId,
                inventoryId: product.inventoryId,
                quantity: returnQuantities[index],
            }));

            const url = `/inventory/supplier-returns?invoiceId=${invoiceDetails.id}&returnInvoiceId=${returnInvoiceNumber}&createdBy=${localStorage.getItem("firstName")}&locationId=${localStorage.getItem("store")}`;

            await api.post(url, productEntries);
            alert("Supplier return created successfully.");
        } catch (error) {
            console.error("Failed to create supplier return:", error);
        }
    };

    const [showSupplierInvoice, setShowSupplierInvoice] = useState(false);

    const createSupplierInvoice = () => {
        setShowSupplierInvoice(true);
    }

    const invoiceRef = useRef();

    const printSupplierInvoice = () => {
        if (!invoiceRef.current) {
            console.error("Invoice reference is null or undefined.");
            return;
        }

        const printWindow = window.open("", "_blank");
        const contentHeight = invoiceRef.current.offsetHeight;

        const styles = `
      <style>
        @media print {
          @page {
            size: 216mm ${contentHeight}px;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            width: 216mm;
            font-family: Arial, sans-serif;
            font-size: 11px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 2px;
            text-align: left;
            font-size: 10px;
          }
           .invoice-header {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
          }
          .invoice-address {
            text-align: center;
            font-size: 12px;
          }
          .invoice-container {
            width: 100%;
          }
        }
      </style>
    `;

        const modalContent = invoiceRef.current.innerHTML;

        printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${invoiceDetails.invoiceNo}</title>
        ${styles}
      </head>
      <body>
        <div class="invoice-container">
          ${modalContent}
        </div>
      </body>
    </html>
  `);

        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.print();
            printWindow.onafterprint = () => {
                printWindow.close();
            };
        };
    }

    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const [showReturnInvoice, setShowReturnInvoice] = useState(false);

    const createReturnInvoice = () => {
        setShowReturnInvoice(true);
    };

    return (
        <Container>
            <Container
                style={{ placeItems: "center", height: `${0.775 * windowSize.height}px`, width: "95vw", display: "flex", flexDirection: "column", overflowY: "scroll", marginTop: "20px" }}
            >
                <h2 className="text-center mb-4">Supplier Return Invoice (GRN Return)</h2>
                <Form onSubmit={handleSubmit}
                      encType="form-data"
                      onKeyDown={(e) => {
                          if (e.key === "Enter") {
                              e.preventDefault();
                          }
                      }}
                >
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group controlId="invoiceNo">
                                <Form.Label>Invoice No</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="invoiceNo"
                                    value={invoiceDetails.invoiceNo}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="returnInvoiceNo">
                                <Form.Label>Return Invoice No</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="returnInvoiceNo"
                                    value={returnInvoiceNumber}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="date">
                                <Form.Label>Date</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="date"
                                    value={new Date(invoiceDetails.date).toISOString().slice(0, 10)}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group controlId="status">
                                <Form.Label>Status</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="status"
                                    value={invoiceDetails.status}
                                    disabled
                                >
                                    <option value="Credit">Credit</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Completed">Completed</option>
                                </Form.Control>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="supplierId">
                                <Form.Label>Supplier Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="supplierId"
                                    value={invoiceDetails.supplierName}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="locationId">
                                <Form.Label>Location</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="locationId"
                                    value={localStorage.getItem("store")}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group controlId="createdBy">
                                <Form.Label>Created By</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="createdBy"
                                    value={localStorage.getItem("firstName")}
                                    disabled
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Table bordered className="mt-3">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Batch Number</th>
                            <th>Quantity</th>
                            <th>Already Returned Quantity</th>
                            <th>Cost Price</th>
                            <th>New Return Quantity</th>
                            <th>Return Value</th>
                            <th>Invoice Total</th>
                            <th>Expiry Date</th>
                        </tr>
                        </thead>
                        <tbody>
                        {products.map((product, index) => (
                            <tr key={index}>
                                <td>{product.name}</td>
                                <td>{product.batchNumber}</td>
                                <td>{product.quantity}</td>
                                <td>{product.returnedQuantity}</td>
                                <td>{product.costPrice}</td>
                                <td>
                                    <input
                                        type="number"
                                        min="0"
                                        max={product.quantity}
                                        value={returnQuantities[index] || ""}
                                        onChange={(e) =>
                                            handleQuantityChange(index, Number(e.target.value))
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </td>
                                <td>{product.costPrice * returnQuantities[index]}</td>
                                <td>{product.costPrice * product.quantity}</td>
                                <td>{new Date(product.expiryDate).toISOString().slice(0, 10)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>

                    <h5>Return Totals</h5>
                    <Row>
                        <Col md={3}>
                            <Form.Group controlId="total">
                                <Form.Label>Invoice total</Form.Label>
                                {products.map((product, index) => (
                                    <Form.Control
                                        type="number"
                                        name="total"
                                        value={product.costPrice * product.quantity}
                                        disabled
                                    />
                                ))}
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="discountPercentage">
                                <Form.Label>Return total</Form.Label>
                                {products.map((product, index) => (
                                    <Form.Control
                                        type="number"
                                        name="discountPercentage"
                                        value={product.costPrice * returnQuantities[index]}
                                        disabled
                                    />
                                ))}
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button type="submit" variant="primary" className="mt-3" onClick={createSupplierInvoice}>
                        Return
                    </Button>

                    <Button variant="secondary" className="mt-3 ms-2" onClick={() => navigate("/Dashboard")}>
                        Close
                    </Button>

                    <Button variant="primary" className="mt-3 ms-2" onClick={createReturnInvoice}>
                        Print
                    </Button>
                </Form>

                <Modal
                    show={showReturnInvoice}
                    onHide={() => setShowReturnInvoice(false)}
                >
                    <Modal.Header closeButton>
                        <Modal.Title> RETURN INVOICE</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <div ref={invoiceRef} style={{ fontSize: '9px' }}>
                            <p>
                                No.2/17/1, Kottawa Malabe Road,
                                <br />
                                Pannipitiya
                            </p>
                            <h6>
                                Tel: 0112 256 3444
                                <br />
                                Whatsapp: 0707 555 444
                            </h6>

                            <p>---------------------------------------------------</p>
                            <p>
                                <strong>Invoice No: </strong>{invoiceDetails.invoiceNo}
                            </p>
                            <p>
                                <strong>Return Invoice No: </strong>{returnInvoiceNumber}
                            </p>
                            <p>
                                <strong>Invoice Date: </strong>{new Date(invoiceDetails.date).toISOString().slice(0, 10)}
                            </p>
                            <p>
                                <strong>Return Date: </strong>{new Date().toISOString().slice(0, 10)}
                            </p>
                            <p>
                                <strong>Status: </strong>{invoiceDetails.status}
                            </p>
                            <p>
                                <strong>Supplier: </strong>{invoiceDetails.supplierName}
                            </p>
                            <p>
                                <strong>Location: </strong>{invoiceDetails.locationId}
                            </p>
                            <p>---------------------------------------------------</p>
                            <Table bordered className="mt-3">
                                <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Batch Number</th>
                                    <th>Quantity</th>
                                    <th>Returned Quantity</th>
                                    <th>Cost Price</th>
                                    <th>Return Quantity</th>
                                    <th>Return Value</th>
                                    <th>Invoice Total</th>
                                    <th>Expiry Date</th>
                                </tr>
                                </thead>
                                <tbody>
                                {products.map((product, index) => (
                                    <tr key={index}>
                                        <td>{product.name}</td>
                                        <td>{product.batchNumber}</td>
                                        <td>{product.quantity}</td>
                                        <td>{product.returnedQuantity}</td>
                                        <td>{product.costPrice}</td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max={product.quantity}
                                                value={returnQuantities[index] || ""}
                                                onChange={(e) =>
                                                    handleQuantityChange(index, Number(e.target.value))
                                                }
                                                style={{ width: "100%" }}
                                            />
                                        </td>
                                        <td>{product.costPrice * returnQuantities[index]}</td>
                                        <td>{product.costPrice * product.quantity}</td>
                                        <td>{new Date(product.expiryDate).toISOString().slice(0, 10)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                            <p>---------------------------------------------------</p>
                            {products.map((product, index) => (
                                <>
                                    <p>
                                        <strong>Invoice Total: </strong>Rs. {product.costPrice * product.quantity}
                                    </p>
                                    <p>
                                        <strong>Return Total: </strong>Rs. {product.costPrice * returnQuantities[index]}
                                    </p>
                                </>
                            ))}
                            <p>---------------------------------------------------</p>

                            <Button variant="primary" onClick={printSupplierInvoice}>
                                Print
                            </Button>
                        </div>
                    </Modal.Body>
                </Modal>
            </Container>
        </Container>
    );
}

export default SupplierReturn;