/**
 * SafeSelect — A drop-in replacement for <Form.Select> and <select> that
 * renders a beautiful, premium react-select component while preserving the
 * EXACT same event contract as native HTML selects:
 *
 *   onChange={(e) => setState(e.target.value)}   ← works unchanged
 *   onBlur={(e) => validate(e.target.name)}       ← works unchanged
 *   name="myField"                                ← forwarded correctly
 *   required                                      ← triggers browser validation
 *   disabled                                      ← forwarded correctly
 *
 * Usage:
 *   Import SafeSelect instead of Form.Select.
 *   Keep ALL existing props and child <option> tags exactly as they are.
 *
 *   <SafeSelect name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
 *       <option value="">All</option>
 *       <option value="ACTIVE">Active</option>
 *   </SafeSelect>
 */

import React, { Children, useMemo } from 'react';
import Select from 'react-select';

export default function SafeSelect({
    // Core native <select> props we must support
    name,
    value,
    onChange,
    onBlur,
    disabled,
    required,
    placeholder,
    multiple,       // multi-select — not commonly used but supported
    className,
    style,

    // react-select specific overrides (optional — advanced use only)
    classNamePrefix,
    isSearchable = false, // Default OFF to match native <select> behaviour
    isClearable = false,

    // Children: <option value="x">Label</option>
    children,

    ...rest
}) {
    // ── 1. Convert <option> children into react-select { value, label } array ──
    const options = useMemo(() => {
        const opts = [];
        Children.forEach(children, (child) => {
            if (!child) return;
            const { value: v = '', children: label, disabled: optDisabled } = child.props || {};
            opts.push({ value: v, label: label ?? v, isDisabled: !!optDisabled });
        });
        return opts;
    }, [children]);

    // ── 2. Derive the currently selected option object ──
    const selectedOption = useMemo(() => {
        if (multiple && Array.isArray(value)) {
            return options.filter((o) => value.includes(o.value));
        }
        // Treat empty string as "no selection"
        if (value === '' || value === null || value === undefined) {
            // If the first option has an empty value, show it as the placeholder
            const first = options[0];
            if (first && first.value === '') return first;
            return null;
        }
        return options.find((o) => String(o.value) === String(value)) ?? null;
    }, [value, options, multiple]);

    // ── 3. Translate react-select → synthetic DOM event ──
    const handleChange = (opt) => {
        if (!onChange) return;

        if (multiple) {
            const values = opt ? opt.map((o) => o.value) : [];
            onChange({ target: { name, value: values } });
            return;
        }

        const newValue = opt ? opt.value : '';
        // Synthetic event mirrors e.target.value / e.target.name
        onChange({ target: { name, value: newValue } });
    };

    const handleBlur = () => {
        if (!onBlur) return;
        onBlur({ target: { name, value: multiple ? (value || []) : (value ?? '') } });
    };

    // ── 4. Determine display placeholder ──
    // If first option has value === '', use its label as the placeholder display
    // (matching native <select> which shows the blank option as default)
    const firstOpt = options[0];
    const reactPlaceholder =
        placeholder ?? (firstOpt && firstOpt.value === '' ? firstOpt.label : 'Select…');

    // Exclude the "blank" first option from the dropdown list so it doesn't
    // appear twice (it's handled by the placeholder).
    const filteredOptions = useMemo(() => {
        if (firstOpt && firstOpt.value === '') {
            return options.slice(1);
        }
        return options;
    }, [options, firstOpt]);

    return (
        <div style={{ position: 'relative', ...style }}>
            <Select
                name={name}
                value={selectedOption && selectedOption.value !== '' ? selectedOption : null}
                onChange={handleChange}
                onBlur={handleBlur}
                options={filteredOptions}
                placeholder={reactPlaceholder}
                isDisabled={disabled}
                isMulti={multiple}
                isSearchable={isSearchable}
                isClearable={isClearable}
                className={`modern-select-container${className ? ` ${className}` : ''}`}
                classNamePrefix={classNamePrefix ?? 'modern-select'}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                menuPlacement="auto"
                styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    // Prevent horizontal scroll: menu expands to fit text
                    menu: (base) => ({
                        ...base,
                        width: 'max-content',
                        minWidth: '100%',
                    }),
                }}
                {...rest}
            />
            {/* Hidden native input to trigger HTML5 required validation */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={
                        multiple
                            ? (value?.length ? 'filled' : '')
                            : (value !== '' && value !== null && value !== undefined ? 'filled' : '')
                    }
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
