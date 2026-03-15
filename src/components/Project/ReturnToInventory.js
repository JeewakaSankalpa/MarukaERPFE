import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function ReturnToInventory() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [inventoryData, setInventoryData] = useState({
        batchNumber: '',
        expiryDate: '',
        quantity: 0,
        unitPrice: 0.0,
        sellingPrice: 0.0,
        locationId: 'warehouse', // Default to warehouse
    });

    // Fetch products based on search query
    const fetchProducts = async (query) => {
        try {
            const response = await api.get(`/products/search?query=${query}`);
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    // Handle product search input
    const handleSearchInput = (e) => {
        setSearchQuery(e.target.value);
        fetchProducts(e.target.value);
    };

    // Handle product selection
    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setProducts([]); // Clear dropdown after selection
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInventoryData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSubmit = {
            ...inventoryData,
            productId: selectedProduct.id, // Attach selected product
        };
        try {
            await api.post('/inventory/add', dataToSubmit);
            toast.success('Inventory added successfully');
        } catch (error) {
            console.error('Failed to add inventory:', error);
            toast.error('Inventory addition failed. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* <div>
                <label>Search Product:</label>
                <input type="text" value={searchQuery} onChange={handleSearchInput} placeholder="Enter product name" />
                {products.length > 0 && (
                    <ul>
                        {products.map((product) => (
                            <li key={product.id} onClick={() => handleProductSelect(product)}>
                                {product.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div> */}

            {/* {selectedProduct && (
                <> */}
                    {/* <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Selected Product: {selectedProduct.name}</h3>
                        </div>
*/}
                    <div>
                        <label>Item Name:</label>
                        <input type="text" name="batchNumber" value={inventoryData.batchNumber}
                               onChange={handleChange}/>
                    </div>
                    <div>
                        <label>Batch Number:</label>
                        <input type="text" name="batchNumber" value={inventoryData.batchNumber}
                               onChange={handleChange}/>
                    </div>
                    {/* <div>
                       <label>Expiry Date:</label>
                       <input type="date" name="expiryDate" value={inventoryData.expiryDate} onChange={handleChange} />
                    </div> */}
                    <div>
                        <label>Quantity:</label>
                        <input type="number" name="quantity" value={inventoryData.quantity} onChange={handleChange}/>
                    </div>
                    {/* <div>
                       <label>Unit Price:</label>
                       <input type="number" name="unitPrice" value={inventoryData.unitPrice} onChange={handleChange}/>
                    </div> */}
                    <div>
                       <label>Selling Price:</label>
                       <input type="number" name="sellingPrice" value={inventoryData.sellingPrice}
                              onChange={handleChange}/>
                    </div>
                    <button type="submit">Return Goods</button>
                {/* </> */}
            {/* )} */}
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </form>
    );
}

export default ReturnToInventory;
