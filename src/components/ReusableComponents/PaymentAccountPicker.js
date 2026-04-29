import React, { useEffect, useState, useMemo } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import api from '../../api/api';
import SafeSelect from './SafeSelect';



/**
 * Reusable Payment Account Picker
 * 
 * Used across all payment forms in the system.
 * Loads payment-tagged accounts from Chart of Accounts.
 * Shows sub-account dropdown when the selected account has sub-accounts.
 * Calls onChange({ paymentAccountId, paymentAccountName, paymentAccountType }) on selection.
 *
 * @param {Function} onChange - called with { paymentAccountId, paymentAccountName, paymentAccountType }
 * @param {string} value - current paymentAccountId (controlled)
 * @param {boolean} required - marks fields as required
 * @param {boolean} disabled - disables the pickers
 */
export default function PaymentAccountPicker({ onChange, value, required = false, disabled = false }) {
    const [paymentAccounts, setPaymentAccounts] = useState([]);
    const [subAccounts, setSubAccounts] = useState([]);
    const [selectedParent, setSelectedParent] = useState(null);
    const [selectedSubId, setSelectedSubId] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Automatically patch legacy accounts in the DB every time just in case, using the user's auth token
        api.post('/finance/accounts/init-payment-types')
            .catch(() => {})
            .finally(() => {
                api.get('/finance/accounts/payment-accounts')
                    .then(res => setPaymentAccounts(res.data || []))
                    .catch(() => {})
                    .finally(() => setLoading(false));
            });
    }, []);

    const handleParentChange = async (accountId) => {
        const acc = paymentAccounts.find(a => a.id === accountId);
        setSelectedParent(acc || null);
        setSelectedSubId('');
        setSubAccounts([]);

        if (acc) {
            setSelectedMethod(''); // Clear default to force manual selection

            // Immediately report the parent selection to parent component but without a method
            onChange({
                paymentAccountId: acc.id,
                paymentAccountName: acc.name,
                paymentAccountType: acc.paymentAccountType || 'OTHER',
                paymentMethod: ''
            });

            // If it has sub-accounts, load them
            if (acc.hasSubAccounts) {
                try {
                    const res = await api.get(`/finance/accounts/${acc.id}/subaccounts`);
                    setSubAccounts(res.data || []);
                } catch {}
            }
        } else {
            setSelectedMethod('');
            onChange({ paymentAccountId: '', paymentAccountName: '', paymentAccountType: '', paymentMethod: '' });
        }
    };

    const emitChange = (subId, method) => {
        if (!selectedParent) return;
        const s = subId ? subAccounts.find(a => a.id === subId) : null;
        onChange({
            paymentAccountId: s?.id || selectedParent.id,
            paymentAccountName: s?.name || selectedParent.name,
            paymentAccountType: selectedParent.paymentAccountType || 'OTHER',
            paymentMethod: method
        });
    };

    const handleSubChange = (subId) => {
        setSelectedSubId(subId);
        emitChange(subId, selectedMethod);
    };

    const handleMethodChange = (v) => {
        setSelectedMethod(v);
        emitChange(selectedSubId, v);
    };

    // Find current parent from value if provided externally
    const currentParentId = selectedParent?.id || (value && !subAccounts.find(s => s.id === value) ? value : '');

    return (
        <Row className="g-2">
            <Col md={subAccounts.length > 0 ? 6 : 12}>
                <Form.Group>
                    <Form.Label>
                        Payment Account {required && <span className="text-danger">*</span>}
                    </Form.Label>
                    <SafeSelect
                        value={currentParentId || ''}
                        onChange={e => handleParentChange(e.target.value)}
                        disabled={disabled || loading}
                        required={required}
                    >
                        <option value="">{loading ? 'Loading accounts...' : '-- Select payment account --'}</option>
                        {paymentAccounts.filter(a => !a.parentAccountId).map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.code})
                            </option>
                        ))}
                    </SafeSelect>
                </Form.Group>
            </Col>

            {subAccounts.length > 0 && (
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Sub-Account <small className="text-muted">(optional)</small></Form.Label>
                        <SafeSelect
                            value={selectedSubId}
                            onChange={e => handleSubChange(e.target.value)}
                            disabled={disabled}
                        >
                            <option value="">-- Use parent account --</option>
                            {subAccounts.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.name} ({sub.code}) — Bal: {Number(sub.balance || 0).toLocaleString()}
                                </option>
                            ))}
                        </SafeSelect>
                        <small className="text-muted">Select specific sub-account for this payment</small>
                    </Form.Group>
                </Col>
            )}

            {selectedParent && (
                <Col md={12} className="mt-3">
                    <Form.Group>
                        <Form.Label>Payment Method <span className="text-danger">*</span></Form.Label>
                        <div className="d-flex gap-3">
                            <Form.Check 
                                type="radio" label="💳 Card" name="paymentMethod" 
                                checked={selectedMethod === 'CARD'} onChange={() => handleMethodChange('CARD')} 
                            />
                            <Form.Check 
                                type="radio" label="🏦 Bank Transfer" name="paymentMethod" 
                                checked={selectedMethod === 'BANK_TRANSFER'} onChange={() => handleMethodChange('BANK_TRANSFER')} 
                            />
                            <Form.Check 
                                type="radio" label="💵 Cash" name="paymentMethod" 
                                checked={selectedMethod === 'CASH'} onChange={() => handleMethodChange('CASH')} 
                            />
                            <Form.Check 
                                type="radio" label="🧾 Cheque" name="paymentMethod" 
                                checked={selectedMethod === 'CHEQUE'} onChange={() => handleMethodChange('CHEQUE')} 
                            />
                        </div>
                    </Form.Group>
                </Col>
            )}
        </Row>
    );
}
