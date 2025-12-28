import React from 'react';
import { Container, Breadcrumb } from 'react-bootstrap';
import { motion } from 'framer-motion';

/**
 * Standard Page Layout
 * @param {string} title - Page Title
 * @param {React.ReactNode} actions - Action buttons (optional)
 * @param {Array} breadcrumbs - [{ label: 'Home', href: '/' }, { label: 'Current', active: true }]
 * @param {React.ReactNode} children - Page Content
 * @param {boolean} fluid - Container fluid (default: false)
 */
const PageLayout = ({ title, actions, breadcrumbs = [], children, fluid = false }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <Container fluid={fluid} className="py-4">
                {/* Header Section */}
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                    <div>
                        {breadcrumbs.length > 0 && (
                            <Breadcrumb className="small mb-1">
                                {breadcrumbs.map((b, idx) => (
                                    <Breadcrumb.Item
                                        key={idx}
                                        href={b.href}
                                        active={b.active}
                                        linkProps={{ to: b.href }} // If using react-router integration
                                    >
                                        {b.label}
                                    </Breadcrumb.Item>
                                ))}
                            </Breadcrumb>
                        )}
                        <h2 className="mb-0 fw-bold text-dark">{title}</h2>
                    </div>

                    {actions && (
                        <div className="d-flex gap-2">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="page-content">
                    {children}
                </div>
            </Container>
        </motion.div>
    );
};

export default PageLayout;
