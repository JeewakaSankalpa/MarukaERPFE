import React from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

/**
 * SafeDatePicker — A drop-in replacement for native <input type="date"> 
 * and <Form.Control type="date"> that renders a modern Ant Design DatePicker 
 * while preserving the EXACT same event contract.
 *
 * Emits: onChange({ target: { name, value: 'YYYY-MM-DD' } })
 */
export default function SafeDatePicker({
    name,
    value,
    onChange,
    onBlur,
    disabled,
    required,
    placeholder,
    className,
    style,
    ...rest
}) {
    // Handle edge cases where value might be empty or invalid
    const dateValue = value && dayjs(value).isValid() ? dayjs(value) : null;

    const handleChange = (date, dateString) => {
        if (!onChange) return;
        // dateString is formatted as 'YYYY-MM-DD' due to format prop
        onChange({ target: { name, value: dateString || '' } });
    };

    const handleBlur = () => {
        if (!onBlur) return;
        onBlur({ target: { name, value: value || '' } });
    };

    return (
        <div style={{ position: 'relative', width: '100%', ...style }}>
            <DatePicker
                name={name}
                value={dateValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                placeholder={placeholder || 'Select date...'}
                format="YYYY-MM-DD"
                className={className}
                allowClear
                style={{ width: '100%' }}
                {...rest}
            />
            {/* Hidden native input to trigger HTML5 required validation seamlessly */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={value || ''}
                    onChange={() => {}}
                    style={{
                        opacity: 0,
                        width: '100%',
                        height: 0,
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        pointerEvents: 'none',
                    }}
                />
            )}
        </div>
    );
}
