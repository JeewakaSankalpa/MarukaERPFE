import React, { useState } from 'react';
import { Alert, Card, Button, Input, Modal, Typography } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/api';

const { Title, Paragraph, Text } = Typography;
const { confirm } = Modal;
const TEST_STOCK_CONFIRMATION = 'DELETE TEST STOCK';

const getApiErrorMessage = (error) => {
    const data = error?.response?.data;
    if (typeof data === 'string') return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return error.message;
};

const SuperAdminPage = () => {
    const [loading, setLoading] = useState(false);
    const [stockResetLoading, setStockResetLoading] = useState(false);
    const [showStockResetModal, setShowStockResetModal] = useState(false);
    const [stockResetConfirmation, setStockResetConfirmation] = useState('');

    const role = (localStorage.getItem('role') || '').toUpperCase();
    const canResetTestStock = ['ADMIN', 'SUPER_ADMIN'].includes(role);

    const showResetConfirm = () => {
        confirm({
            title: 'Are you absolutely sure?',
            icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
            content: (
                <div>
                    <p>This action will perform a <strong>HARD RESET</strong> of the entire system.</p>
                    <p>All data (Projects, Invoices, Users, Inventory, etc.) will be permanently deleted.</p>
                    <p>The system will be reset to a clean state with a single default admin user:</p>
                    <ul>
                        <li>Username: <strong>Admin</strong></li>
                        <li>Password: <strong>Admin#1</strong></li>
                        <li>Name: <strong>Jeewaka Perera</strong></li>
                        <li>Email: <strong>jeewakasperera@gmail.com</strong></li>
                    </ul>
                    <Text type="danger">This action cannot be undone!</Text>
                </div>
            ),
            okText: 'Yes, Reset System',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk() {
                handleReset();
            },
        });
    };

    const handleReset = async () => {
        setLoading(true);
        try {
            await api.post('/admin/system-reset');
            toast.success('System Reset Successful. Redirecting to login...');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            console.error(error);
            toast.error('System Reset Failed: ' + getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleTestStockReset = async () => {
        setStockResetLoading(true);
        try {
            const { data } = await api.post('/admin/test-stock-reset', {
                confirmation: stockResetConfirmation,
            });
            const totalDeleted = data?.totalDeleted ?? 0;
            toast.success(`Test stock cleared. ${totalDeleted} stock-related record(s) deleted.`);
            setShowStockResetModal(false);
            setStockResetConfirmation('');
        } catch (error) {
            console.error(error);
            toast.error('Stock reset failed: ' + getApiErrorMessage(error));
        } finally {
            setStockResetLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {canResetTestStock && (
                <Card title="Local Test Stock Reset" style={{ width: 600, borderColor: '#faad14' }} headStyle={{ backgroundColor: '#fffbe6', color: '#ad6800' }}>
                    <div style={{ textAlign: 'center' }}>
                        <ExclamationCircleOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
                        <Title level={3}>Clear Stock Only</Title>
                        <Paragraph>
                            This removes current stock batches, stock movement ledger entries, serials, stock audits,
                            and stock verification runs. Products and other business records are kept.
                        </Paragraph>
                        <Alert
                            type="warning"
                            showIcon
                            message="Local test database only"
                            description="The backend also blocks this action unless the request comes from localhost and the logged-in user is a Super Admin."
                            style={{ textAlign: 'left', marginBottom: 16 }}
                        />
                        <Button
                            danger
                            size="large"
                            icon={<DeleteOutlined />}
                            onClick={() => setShowStockResetModal(true)}
                            loading={stockResetLoading}
                            style={{ marginTop: 8 }}
                        >
                            DELETE ALL TEST STOCK
                        </Button>
                    </div>
                </Card>
            )}

            <Card title="Super Admin Control Panel" style={{ width: 600, borderColor: 'red' }} headStyle={{ backgroundColor: '#fff1f0', color: 'red' }}>
                <div style={{ textAlign: 'center' }}>
                    <ExclamationCircleOutlined style={{ fontSize: 48, color: 'red', marginBottom: 16 }} />
                    <Title level={3}>Danger Zone</Title>
                    <Paragraph>
                        The button below will completely verify and wipe all database collections in MongoDB.
                        It is intended for development purposes or full system re-initialization only.
                    </Paragraph>
                    <Button
                        type="primary"
                        danger
                        size="large"
                        icon={<DeleteOutlined />}
                        onClick={showResetConfirm}
                        loading={loading}
                        style={{ marginTop: 16 }}
                    >
                        RESET ENTIRE SYSTEM
                    </Button>
                </div>
            </Card>
            <Modal
                title="Delete all test stock?"
                open={showStockResetModal}
                okText="Delete Test Stock"
                okType="danger"
                cancelText="Cancel"
                confirmLoading={stockResetLoading}
                onOk={handleTestStockReset}
                okButtonProps={{ disabled: stockResetConfirmation !== TEST_STOCK_CONFIRMATION }}
                onCancel={() => {
                    setShowStockResetModal(false);
                    setStockResetConfirmation('');
                }}
            >
                <Paragraph>
                    This will permanently clear stock batches and stock-side history from the local test database.
                    Products will remain, so you can add fresh stock afterward.
                </Paragraph>
                <Paragraph>
                    Type <Text strong>{TEST_STOCK_CONFIRMATION}</Text> to confirm.
                </Paragraph>
                <Input
                    value={stockResetConfirmation}
                    onChange={(event) => setStockResetConfirmation(event.target.value)}
                    placeholder={TEST_STOCK_CONFIRMATION}
                    autoFocus
                />
            </Modal>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </div>
    );
};

export default SuperAdminPage;
