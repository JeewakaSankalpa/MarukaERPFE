import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaArrowRight, FaHome, FaBox, FaUsers, FaProjectDiagram } from 'react-icons/fa';
import './CommandPalette.css'; // We'll create a small CSS file for cmdk styles if needed, or inline

const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    const previousFocusRef = useRef(null);

    const close = useCallback(() => {
        setOpen(false);
        window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
    }, []);

    // Toggle on Ctrl+K / Cmd+K
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((current) => {
                    if (!current) previousFocusRef.current = document.activeElement;
                    else window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
                    return !current;
                });
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        inputRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...dialogRef.current.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])')]
                .filter(element => !element.disabled && element.getAttribute('aria-hidden') !== 'true');
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, close]);

    const runCommand = (command) => {
        close();
        if (command) command();
    };

    // Navigation Items
    const pages = [
        { id: 'dashboard', name: 'Dashboard', icon: <FaHome />, path: '/dashboard' },
        { id: 'projects', name: 'Projects', icon: <FaProjectDiagram />, path: '/projects/search' },
        { id: 'inventory', name: 'Inventory View', icon: <FaBox />, path: '/inventory/search' },
        { id: 'employees', name: 'Employee Directory', icon: <FaUsers />, path: '/employee/list' },
        { id: 'create_project', name: 'Create Project', icon: <FaProjectDiagram />, path: '/projects/create' },
        { id: 'create_pr', name: 'Purchase Request', icon: <FaBox />, path: '/inventory/pr' }
    ];

    if (!open) return null;

    return (
        <div className="command-palette-overlay" onClick={close}>
            <div ref={dialogRef} className="command-palette-container" role="dialog" aria-modal="true" aria-label="Global search" onClick={e => e.stopPropagation()}>
                <Command label="Global Search" shouldFilter={true} className="cmdk-root">
                    <div className="cmdk-search-wrapper">
                        <FaSearch className="cmdk-icon" />
                        <Command.Input
                            ref={inputRef}
                            aria-label="Search commands"
                            placeholder="Type a command or search..."
                            className="cmdk-input"
                        />
                    </div>

                    <Command.List className="cmdk-list">
                        <Command.Empty className="cmdk-empty">No results found.</Command.Empty>

                        <Command.Group heading="Navigation" className="cmdk-group">
                            {pages.map(page => (
                                <Command.Item
                                    key={page.id}
                                    onSelect={() => runCommand(() => navigate(page.path))}
                                    className="cmdk-item"
                                >
                                    <span className="cmdk-item-icon">{page.icon}</span>
                                    {page.name}
                                    <span className="cmdk-shortcut"><FaArrowRight size={10} /></span>
                                </Command.Item>
                            ))}
                        </Command.Group>

                        <Command.Group heading="System" className="cmdk-group">
                            <Command.Item onSelect={() => runCommand(() => window.print())} className="cmdk-item">
                                Print Page
                            </Command.Item>
                            {/* Add Logout or other system actions here */}
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    );
};

export default CommandPalette;
