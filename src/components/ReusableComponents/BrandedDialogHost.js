import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { DIALOG_EVENT } from "../../utils/brandedDialogs";

const toneConfig = {
    danger: {
        icon: ShieldAlert,
        className: "maruka-dialog-danger",
    },
    warning: {
        icon: AlertTriangle,
        className: "maruka-dialog-warning",
    },
    success: {
        icon: CheckCircle2,
        className: "maruka-dialog-success",
    },
    info: {
        icon: Info,
        className: "maruka-dialog-info",
    },
};

export default function BrandedDialogHost() {
    const [dialog, setDialog] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const confirmButtonRef = useRef(null);
    const inputRef = useRef(null);
    const activeElementRef = useRef(null);

    useEffect(() => {
        const handleRequest = (event) => {
            activeElementRef.current = document.activeElement;
            setDialog(event.detail);
            setInputValue(event.detail.request.defaultValue || "");
        };

        window.addEventListener(DIALOG_EVENT, handleRequest);
        return () => window.removeEventListener(DIALOG_EVENT, handleRequest);
    }, []);

    const closeDialog = useCallback((result) => {
        if (!dialog) return;

        const { request, resolve } = dialog;
        const value = request.type === "prompt"
            ? (result ? inputValue : null)
            : Boolean(result);

        resolve(value);
        setDialog(null);
        window.setTimeout(() => activeElementRef.current?.focus?.(), 0);
    }, [dialog, inputValue]);

    useEffect(() => {
        if (!dialog) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            if (dialog.request.type === "prompt") {
                inputRef.current?.focus();
                inputRef.current?.select?.();
            } else {
                confirmButtonRef.current?.focus();
            }
        }, 0);

        const handleKeyDown = (event) => {
            if (event.key === "Escape") closeDialog(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [dialog, closeDialog]);

    if (!dialog) return null;

    const { request } = dialog;
    const config = toneConfig[request.tone] || toneConfig.info;
    const Icon = config.icon;
    const isPrompt = request.type === "prompt";

    return (
        <div className="maruka-dialog-layer" role="presentation" onMouseDown={() => closeDialog(false)}>
            <section
                className={`maruka-dialog ${config.className}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="maruka-dialog-title"
                aria-describedby={request.message ? "maruka-dialog-message" : undefined}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="maruka-dialog-header">
                    <span className="maruka-dialog-icon" aria-hidden="true">
                        <Icon size={22} strokeWidth={2} />
                    </span>
                    <div>
                        <h2 id="maruka-dialog-title">{request.title}</h2>
                        {request.message && <p id="maruka-dialog-message">{request.message}</p>}
                    </div>
                    <button
                        type="button"
                        className="maruka-dialog-close"
                        onClick={() => closeDialog(false)}
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                {isPrompt && (
                    <label className="maruka-dialog-field">
                        <span>{request.label}</span>
                        {request.multiline ? (
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                                rows={4}
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                            />
                        )}
                    </label>
                )}

                <div className="maruka-dialog-actions">
                    <button
                        type="button"
                        className="maruka-dialog-button maruka-dialog-button-secondary"
                        onClick={() => closeDialog(false)}
                    >
                        {request.cancelLabel || "Cancel"}
                    </button>
                    <button
                        type="button"
                        className="maruka-dialog-button maruka-dialog-button-primary"
                        onClick={() => closeDialog(true)}
                        ref={confirmButtonRef}
                    >
                        {request.confirmLabel || "Confirm"}
                    </button>
                </div>
            </section>
        </div>
    );
}
