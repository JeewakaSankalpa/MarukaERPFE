import React from "react";
import logo from "../../assets/logo.jpeg";
import Colors from "../../resources/Colors";

/**
 * A reusable layout for printing reports.
 * 
 * Usage:
 * <ReportLayout title="Salary Sheet - Dec 2024">
 *    <Table>...</Table>
 * </ReportLayout>
 */
const company = {
    name: "Maruka Technologies (Pvt) Ltd",
    address: "558/7, Sethsiri Place, Pannipitiya, Sri Lanka 10230",
    email: "rohan@maruka.lk",
    vatNo: "174038295-7000",
};

const ReportLayout = ({ title, subtitle, children, orientation = "portrait" }) => {
    const user = localStorage.getItem("username") || "System User";
    const date = new Date().toLocaleString();

    return (
        <div className="report-container">
            {/* Print Styles */}
            <style>{`
        @media print {
          @page { size: ${orientation}; margin: 10mm; }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }

          body { -webkit-print-color-adjust: exact; }

          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Only show the report container and its children */
          .report-container, .report-container * {
            visibility: visible;
          }

          /*
           * Reports are commonly rendered inside a Bootstrap modal. Its fixed
           * viewport and overflow rules clip multi-page print jobs unless the
           * modal is returned to normal document flow for printing.
           */
          .report-print-modal {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          .report-print-modal .modal-dialog,
          .report-print-modal .modal-content,
          .report-print-modal .modal-body {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            transform: none !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .modal-backdrop {
            display: none !important;
          }

          /* Keep the report in normal flow so the browser can paginate it. */
          .report-container {
            position: static !important;
            width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white;
          }

          .report-container section,
          .report-container tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .no-print { display: none !important; }
        }
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid ${Colors.mainBlue};
            padding-bottom: 12px;
            margin-bottom: 20px;
            gap: 20px;
        }
        .report-footer {
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 12px;
            color: #666;
            display: flex;
            justify-content: space-between;
        }
        .company-info h2 { margin: 0 0 4px; color: ${Colors.mainBlue}; font-size: 22px; }
        .company-info p { margin: 0; font-size: 12px; line-height: 1.35; color: #333; }
        .report-title { min-width: 230px; }
        .report-title h3 {
            margin: 0;
            color: #111827;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 0;
            text-transform: uppercase;
        }
        .report-title p { margin: 4px 0 0; font-size: 12px; color: #555; }
      `}</style>

            {/* Header */}
            <div className="report-header">
                <div className="d-flex align-items-center gap-3">
                    <img src={logo} alt="Company Logo" style={{ height: "60px", width: "auto" }} />
                    <div className="company-info">
                        <h2>{company.name}</h2>
                        <p>{company.address}</p>
                        <p>Email: {company.email}</p>
                        <p>VAT Reg No: {company.vatNo}</p>
                    </div>
                </div>
                <div className="text-end report-title">
                    <h3>{title}</h3>
                    {subtitle && <p>{subtitle}</p>}
                </div>
            </div>

            {/* Content */}
            <div className="report-content">
                {children}
            </div>

            {/* Footer */}
            <div className="report-footer">
                <div>
                    <strong>Generated By:</strong> {user}
                </div>
                <div>
                    <strong>Date:</strong> {date}
                </div>
            </div>
        </div >
    );
};

export default ReportLayout;
