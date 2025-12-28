import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaArrowRight, FaHome, FaBox, FaUsers, FaProjectDiagram } from 'react-icons/fa';
import './CommandPalette.css'; // We'll create a small CSS file for cmdk styles if needed, or inline

const CommandPalette = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    // Toggle on Ctrl+K / Cmd+K
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command) => {
        setOpen(false);
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
        <div className="command-palette-overlay" onClick={() => setOpen(false)}>
            <div className="command-palette-container" onClick={e => e.stopPropagation()}>
                <Command label="Global Search" shouldFilter={true} className="cmdk-root">
                    <div className="cmdk-search-wrapper">
                        <FaSearch className="cmdk-icon" />
                        <Command.Input
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
