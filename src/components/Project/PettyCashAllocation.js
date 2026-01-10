import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import axios from 'axios';

const { Option } = Select;

const PettyCashAllocation = ({ projectId, visible, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchAccounts();
        }
    }, [visible]);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/finance/accounts');
            // Filter only Asset/Cash accounts
            setAccounts(res.data.filter(a => a.type === 'ASSET'));
        } catch (error) {
            console.error("Error fetching accounts", error);
        }
    };

    const handleAllocate = async (values) => {
        setLoading(true);
        try {
            await axios.post(`http://localhost:8080/api/project-accounts/${projectId}/petty-cash/allocate`, {
                amount: parseFloat(values.amount),
                sourceAccountId: values.sourceAccountId
            });
            message.success('Petty Cash Allocated Successfully');
            form.resetFields();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            message.error('Allocation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Allocate Petty Cash"
            open={visible}
            onCancel={onClose}
            onOk={() => form.submit()}
            confirmLoading={loading}
        >
            <Form form={form} layout="vertical" onFinish={handleAllocate}>
                <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Please enter amount' }]}>
                    <Input prefix="$" type="number" />
                </Form.Item>

                <Form.Item name="sourceAccountId" label="Source Account" rules={[{ required: true, message: 'Select source' }]}>
                    <Select placeholder="Select Bank/Cash Account">
                        {accounts.map(acc => (
                            <Option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.code}) - Bal: {acc.balance}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PettyCashAllocation;
