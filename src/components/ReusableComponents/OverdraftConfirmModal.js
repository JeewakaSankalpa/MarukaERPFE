import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';

/**
 * Overdraft Confirmation Modal
 * Shown when the payment amount exceeds the selected account's balance.
 * 
 * Props:
 *   show        - boolean
 *   amount      - payment amount
 *   balance     - current account balance
 *   accountName - name of the account
 *   onConfirm   - called when user clicks "Yes, overdraft"
 *   onCancel    - called when user cancels
 */
export default function OverdraftConfirmModal({ show, amount, balance, accountName, onConfirm, onCancel }) {
    const shortage = (Number(amount) - Number(balance)).toFixed(2);
    return (
        <Modal show={show} onHide={onCancel} centered>
            <Modal.Header closeButton style={{ background: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
                <Modal.Title>⚠️ Insufficient Account Balance</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant="warning" className="mb-3">
                    <strong>{accountName}</strong> has a current balance of{' '}
                    <strong>Rs. {Number(balance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>,
                    which is <strong>Rs. {shortage}</strong> less than the payment amount of{' '}
                    <strong>Rs. {Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>.
                </Alert>
                <p className="mb-0">
                    Do you want to <strong>overdraft this account</strong>? The payment will be recorded and the 
                    account balance will go negative. This will be reflected in the ledger.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="warning" onClick={onConfirm}>✅ Yes, Proceed with Overdraft</Button>
            </Modal.Footer>
        </Modal>
    );
}
