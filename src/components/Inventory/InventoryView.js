import React, { useState, useEffect } from 'react';
import { Table, Container, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import Select from 'react-select';
import api from '../../services/api';
import jsPDF from "jspdf";
import "jspdf-autotable";

function InventoryView() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [locationOptions, setLocationOptions] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [genericNameFilter, setGenericNameFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [expiryFilter, setExpiryFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [batchDetails, setBatchDetails] = useState([]);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        fetchInventory();
        fetchLocations();
        setUserName(localStorage.getItem('userName') || '');
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await api.get('/inventory/available-quantities');
            setInventoryItems(response.data || []); // Use an empty array as fallback
            setFilteredItems(response.data || []); // Use an empty array as fallback
        } catch (error) {
            console.error('Failed to fetch inventory items:', error);
            setInventoryItems([]); // Set to empty array on error
            setFilteredItems([]); // Set to empty array on error
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await api.get('/store/all');
            setLocationOptions(
                (response.data || []).map((location) => ({
                    value: location.name,
                    label: location.name,
                }))
            );
        } catch (error) {
            console.error('Failed to fetch locations:', error);
            setLocationOptions([]); // Set to empty array on error
        }
    };

    const fetchBatchDetails = async (productId) => {
        try {
            const response = await api.get(`/inventory/available-batches?productId=${productId}`);
            setBatchDetails(response.data || []); // Use an empty array as fallback
        } catch (error) {
            console.error('Failed to fetch batch details:', error);
            setBatchDetails([]); // Set to empty array on error
        }
    };

    const applyFilters = () => {
        let filtered = (inventoryItems || []).map((item) => {
            const totalQuantity = (item.locationQuantities || []).reduce(
                (sum, lq) => sum + lq.quantity,
                0
            );

            const availableQuantity = selectedLocations.length > 0
                ? (item.locationQuantities || [])
                    .filter((lq) =>
                        selectedLocations.some((location) => location.value === lq.locationId)
                    )
                    .reduce((sum, lq) => sum + lq.quantity, 0)
                : totalQuantity;

            const availableStores = selectedLocations.length > 0
                ? (item.locationQuantities || []).filter((lq) =>
                    selectedLocations.some((location) => location.value === lq.locationId)
                )
                : item.locationQuantities || [];

            return {
                ...item,
                totalQuantity,
                availableQuantity,
                availableStores,
            };
        });

        if (genericNameFilter) {
            filtered = filtered.filter((item) =>
                item.productName?.toLowerCase().includes(genericNameFilter.toLowerCase())
            );
        }

        if (supplierFilter) {
            filtered = filtered.filter((item) => item.product?.supplierName === supplierFilter);
        }

        if (expiryFilter) {
            const today = new Date();
            const filterDate = new Date(today);

            switch (expiryFilter) {
                case '1week':
                    filterDate.setDate(today.getDate() + 7);
                    break;
                case '2weeks':
                    filterDate.setDate(today.getDate() + 14);
                    break;
                case '1month':
                    filterDate.setMonth(today.getMonth() + 1);
                    break;
                case '3months':
                    filterDate.setMonth(today.getMonth() + 3);
                    break;
                default:
                    break;
            }

            filtered = filtered.filter((item) =>
                (item.locationQuantities || []).some((lq) => new Date(lq.expiryDate) <= filterDate)
            );
        }

        // Filter out items with zero available quantity in selected stores
        filtered = filtered.filter((item) => item.availableQuantity > 0);

        setFilteredItems(filtered);
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        fetchBatchDetails(product.productId);
        setShowModal(true);
    };

    const handleStoreClick = (product, store) => {
        alert(`Product: ${product.productName}\nStore: ${store.locationId}\nQuantity: ${store.quantity}`);
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(14);
        doc.text('Inventory View Report', 105, 10, { align: 'center' });

        // Add Report Details
        const currentDate = new Date().toLocaleString();
        doc.setFontSize(10);
        doc.text(`Generated By: ${userName}`, 10, 20);
        doc.text(`Generated On: ${currentDate}`, 10, 25);

        // Add Filters to the PDF
        doc.setFontSize(12);
        doc.text('Filters Applied:', 10, 35);

        let yPosition = 40;

        if (selectedLocations.length > 0) {
            const locations = selectedLocations.map((loc) => loc.label).join(', ');
            doc.text(`Locations: ${locations}`, 10, yPosition);
            yPosition += 5;
        }

        if (genericNameFilter) {
            doc.text(`Generic Name Filter: ${genericNameFilter}`, 10, yPosition);
            yPosition += 5;
        }

        if (supplierFilter) {
            doc.text(`Supplier Filter: ${supplierFilter}`, 10, yPosition);
            yPosition += 5;
        }

        if (expiryFilter) {
            let expiryText = '';
            switch (expiryFilter) {
                case '1week':
                    expiryText = 'Within 1 Week';
                    break;
                case '2weeks':
                    expiryText = 'Within 2 Weeks';
                    break;
                case '1month':
                    expiryText = 'Within 1 Month';
                    break;
                case '3months':
                    expiryText = 'Within 3 Months';
                    break;
                default: 
                    expiryText = 'Not Applied';
            }
            doc.text(`Expiry Filter: ${expiryText}`, 10, yPosition);
            yPosition += 5;
        }

        if (yPosition > 40) yPosition += 5;

        // Add Table with Data
        const tableColumnHeaders = ['Product Name', 'Total Quantity', 'Quantity in Selected Stores', 'Available Stores'];
        const tableRows = filteredItems.map((item) => [
            item.productName,
            item.totalQuantity,
            item.availableQuantity,
            item.availableStores
                .map(
                    (store) =>
                        `${locationOptions.find((loc) => loc.value === store.locationId)?.label || store.locationId}: ${
                            store.quantity
                        }`
                )
                .join('\n'),
        ]);

        doc.autoTable({
            head: [tableColumnHeaders],
            body: tableRows,
            startY: yPosition,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [135, 206, 235] },
        });

        // Save PDF
        // doc.save('Inventory_Report.pdf');
        const pdfData = doc.output("blob");
        const pdfURL = URL.createObjectURL(pdfData);
        const printWindow = window.open(pdfURL, "_blank");
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            console.error("Failed to open print window. Please check your browser's pop-up settings.");
        }
    };
    return (
        <Container className="my-5">
            <h2 className="text-center mb-4">Inventory View</h2>
            <Form className="mb-4">
                <Row>
                    <Col>
                        <Form.Group controlId="locationFilter">
                            <Form.Label>Location</Form.Label>
                            <Select
                                isMulti
                                value={selectedLocations}
                                onChange={setSelectedLocations}
                                options={locationOptions}
                                placeholder="Select store locations"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="genericNameFilter">
                            <Form.Label>Generic Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={genericNameFilter}
                                onChange={(e) => setGenericNameFilter(e.target.value)}
                                placeholder="Enter generic name"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="supplierFilter">
                            <Form.Label>Supplier</Form.Label>
                            <Form.Control
                                type="text"
                                value={supplierFilter}
                                onChange={(e) => setSupplierFilter(e.target.value)}
                                placeholder="Enter supplier name"
                            />
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group controlId="expiryFilter">
                            <Form.Label>Expiration Date</Form.Label>
                            <Form.Control as="select" value={expiryFilter}
                                          onChange={(e) => setExpiryFilter(e.target.value)}>
                                <option value="">Select expiration filter</option>
                                <option value="1week">Within 1 Week</option>
                                <option value="2weeks">Within 2 Weeks</option>
                                <option value="1month">Within 1 Month</option>
                                <option value="3months">Within 3 Months</option>
                            </Form.Control>
                        </Form.Group>
                    </Col>
                </Row>
                <div className="d-flex justify-content-between mt-3">
                    <Button variant="primary" onClick={applyFilters}>Apply Filters</Button>
                    <Button variant="secondary" onClick={generatePDF} >Print View</Button>
                </div>
            </Form>
            <Table bordered hover responsive className="text-center">
                <thead className="table-primary">
                <tr>
                    <th>Product Name</th>
                    <th>Total Quantity (All Locations)</th>
                    <th>Quantity in Selected Stores</th>
                    <th>Available Stores</th>
                </tr>
                </thead>
                <tbody>
                {(filteredItems || []).map((item) => (
                    <tr key={item.productId} onClick={() => handleProductClick(item)} style={{ cursor: "pointer" }}>
                        <td>{item.productName}</td>
                        <td>{item.totalQuantity}</td>
                        <td>{item.availableQuantity}</td>
                        <td>
                            {(item.availableStores || []).map((store) => (
                                <div
                                    key={store.locationId}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStoreClick(item, store);
                                    }}
                                    style={{ cursor: "pointer", textDecoration: "underline" }}
                                >
                                    {locationOptions.find((loc) => loc.value === store.locationId)?.label || store.locationId}:{" "}
                                    {store.quantity}
                                </div>
                            ))}
                        </td>
                    </tr>
                ))}
                </tbody>
            </Table>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Batch Details for {selectedProduct?.productName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table bordered hover responsive className="text-center">
                        <thead className="table-primary">
                        <tr>
                            <th>Batch Number</th>
                            <th>Quantity</th>
                            <th>Expiry Date</th>
                            <th>Cost Price</th>
                            <th>Wholesale Price</th>
                            <th>Retail Price</th>
                            <th>Location</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(batchDetails || []).map((batch) => (
                            <tr key={batch.id}>
                                <td>{batch.batchNumber}</td>
                                <td>{batch.quantity}</td>
                                <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                                <td>{batch.costPrice}</td>
                                <td>{batch.wholesalePrice}</td>
                                <td>{batch.retailPrice}</td>
                                <td>{locationOptions.find((loc) => loc.value === batch.locationId)?.label}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default InventoryView;
