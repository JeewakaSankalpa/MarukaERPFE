import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';
import api from '../../services/api';

function InventoryAdd() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inventoryData, setInventoryData] = useState({
    itemName: '',
    batchNumber: '',
    expiryDate: '',
    quantity: 0,
    unitPrice: 0.0,
    sellingPrice: 0.0,
    locationId: 'warehouse',
  });

  const fetchProducts = async (query) => {
    try {
      const response = await api.get(`/products/search?query=${query}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value);
    fetchProducts(e.target.value);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setInventoryData((prev) => ({ ...prev, itemName: product.name }));
    setProducts([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInventoryData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/inventory/add', {
        ...inventoryData,
        productId: selectedProduct?.id,
      });
      alert('Inventory added successfully');
    } catch (error) {
      console.error('Failed to add inventory:', error);
      alert('Inventory addition failed.');
    }
  };

  return (
    <Container className="my-5">
      <h2 className="text-center mb-4">Add Inventory</h2>

      <Form onSubmit={handleSubmit}>
        {/* Search Product */}
        {/* <Form.Group controlId="searchProduct" className="mb-3">
          <Form.Label>Search Product</Form.Label>
          <Form.Control
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            placeholder="Enter product name"
          />
          {products.length > 0 && (
            <ul className="list-group mt-2">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="list-group-item list-group-item-action"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleProductSelect(product)}
                >
                  {product.name}
                </li>
              ))}
            </ul>
          )}
        </Form.Group> */}

        {/* {selectedProduct && ( */}
          {/* <> */}
            <Row>
              <Col md={6}>
                <Form.Group controlId="itemName" className="mb-3">
                  <Form.Label>Item Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="itemName"
                    value={inventoryData.itemName}
                    onChange={handleChange}
                    required
                    // disabled
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="batchNumber" className="mb-3">
                  <Form.Label>Batch Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="batchNumber"
                    value={inventoryData.batchNumber}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group controlId="expiryDate" className="mb-3">
                  <Form.Label>Expiry Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="expiryDate"
                    value={inventoryData.expiryDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="quantity" className="mb-3">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    name="quantity"
                    value={inventoryData.quantity}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group controlId="unitPrice" className="mb-3">
                  <Form.Label>Unit Price</Form.Label>
                  <Form.Control
                    type="number"
                    name="unitPrice"
                    value={inventoryData.unitPrice}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="sellingPrice" className="mb-3">
                  <Form.Label>Selling Price</Form.Label>
                  <Form.Control
                    type="number"
                    name="sellingPrice"
                    value={inventoryData.sellingPrice}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button type="submit" variant="primary" className="me-2">
              Add to Inventory
            </Button>
            <Button type="reset" variant="secondary">
              Reset
            </Button>
          {/* </> */}
        {/* )} */}
      </Form>
    </Container>
  );
}

export default InventoryAdd;
