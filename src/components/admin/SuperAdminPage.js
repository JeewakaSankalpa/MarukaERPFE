import React, { useState } from 'react';
import { Card, Button, Modal, message, Typography } from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/api';

const { Title, Paragraph, Text } = Typography;
const { confirm } = Modal;

const SuperAdminPage = () => {
    const [loading, setLoading] = useState(false);

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
            message.success('System Reset Successful. Redirecting to login...');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/login';
            }, 2000);
        } catch (error) {
            console.error(error);
            message.error('System Reset Failed: ' + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
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
        </div>
    );
};

export default SuperAdminPage;
