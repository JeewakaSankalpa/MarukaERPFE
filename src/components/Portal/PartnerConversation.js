import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";
import { Image, KeyRound, LockKeyhole, Paperclip, Send, ShieldCheck } from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { decryptAttachmentBlob, decryptText, encryptFile, encryptText } from "../../utils/partnerCrypto";

const targetLabel = (targetType) => targetType === "SUPPLIER_PO" ? "supplier order" : "customer project";

export default function PartnerConversation({ targetType, targetId, title, subtitle, listPath, postPath, onUnreadChanged }) {
    const { userId, username, userType } = useAuth();
    const storageKey = `maruka.partner-key.${targetType}.${targetId}`;
    const [passphrase, setPassphrase] = useState(() => sessionStorage.getItem(storageKey) || "");
    const [draftKey, setDraftKey] = useState("");
    const [messages, setMessages] = useState([]);
    const [decryptedMessages, setDecryptedMessages] = useState({});
    const [content, setContent] = useState("");
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef(null);

    const canUseCrypto = typeof crypto !== "undefined" && !!crypto.subtle;
    const isPartner = userType === "CUSTOMER" || userType === "SUPPLIER";

    const loadMessages = useCallback(async () => {
        if (!targetId || !listPath) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.get(listPath);
            setMessages(res.data || []);
            onUnreadChanged?.();
        } catch (e) {
            setError(e?.response?.data?.message || "Could not load encrypted messages.");
        } finally {
            setLoading(false);
        }
    }, [listPath, onUnreadChanged, targetId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, decryptedMessages]);

    useEffect(() => {
        let alive = true;
        if (!passphrase) {
            setDecryptedMessages({});
            return () => { alive = false; };
        }
        (async () => {
            const next = {};
            for (const message of messages) {
                try {
                    next[message.id] = await decryptText(message, passphrase);
                } catch {
                    next[message.id] = null;
                }
            }
            if (alive) setDecryptedMessages(next);
        })();
        return () => { alive = false; };
    }, [messages, passphrase]);

    const unlock = (event) => {
        event.preventDefault();
        const value = draftKey.trim();
        if (!value) return;
        sessionStorage.setItem(storageKey, value);
        setPassphrase(value);
        setDraftKey("");
    };

    const lock = () => {
        sessionStorage.removeItem(storageKey);
        setPassphrase("");
        setDecryptedMessages({});
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!content.trim() && files.length === 0) return;
        if (!passphrase) {
            setError("Unlock this conversation before sending.");
            return;
        }
        setSending(true);
        setError("");
        try {
            const attachments = [];
            for (const file of files) {
                const encrypted = await encryptFile(file, passphrase);
                const formData = new FormData();
                formData.append("file", encrypted.blob, `${file.name}.encrypted`);
                const res = await api.post(`/partner-communications/${targetType}/${targetId}/attachments`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                attachments.push({
                    ...res.data,
                    originalName: encrypted.originalName,
                    iv: encrypted.iv,
                    salt: encrypted.salt,
                    mimeType: encrypted.mimeType,
                    size: encrypted.size,
                });
            }

            const encryptedText = await encryptText(content.trim() || "[Attachment]", passphrase);
            const res = await api.post(postPath, { ...encryptedText, attachments });
            setMessages((prev) => [...prev, res.data]);
            setContent("");
            setFiles([]);
            onUnreadChanged?.();
        } catch (e) {
            setError(e?.response?.data?.message || "Could not send encrypted message.");
        } finally {
            setSending(false);
        }
    };

    const helperText = useMemo(() => {
        if (!canUseCrypto) return "This browser does not support Web Crypto, so encrypted chat is unavailable here.";
        if (!passphrase) return "Enter the shared communication key for this project or order.";
        return "Unlocked locally. The server only receives encrypted message and attachment data.";
    }, [canUseCrypto, passphrase]);

    return (
        <div className="partner-chat">
            <div className="partner-chat-header">
                <div>
                    <div className="partner-chat-eyebrow">
                        <ShieldCheck size={14} aria-hidden="true" />
                        End-to-end encrypted
                    </div>
                    <h3>{title || "Chat and notifications"}</h3>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <Badge bg={passphrase ? "success" : "secondary"}>{passphrase ? "Unlocked" : "Locked"}</Badge>
                    {passphrase ? <Button variant="outline-secondary" size="sm" onClick={lock}>Lock</Button> : null}
                </div>
            </div>

            <Alert variant={passphrase ? "success" : "light"} className="partner-chat-security">
                <LockKeyhole size={17} aria-hidden="true" />
                <span>{helperText}</span>
            </Alert>

            {!passphrase && canUseCrypto && (
                <Form onSubmit={unlock} className="partner-key-form">
                    <KeyRound size={18} aria-hidden="true" />
                    <Form.Control
                        type="password"
                        value={draftKey}
                        onChange={(event) => setDraftKey(event.target.value)}
                        placeholder={`Shared key for this ${targetLabel(targetType)}`}
                        autoComplete="off"
                    />
                    <Button type="submit" variant="dark" disabled={!draftKey.trim()}>Unlock</Button>
                </Form>
            )}

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="partner-message-list" aria-live="polite">
                {loading ? (
                    <div className="partner-chat-empty"><Spinner size="sm" /> Loading encrypted messages...</div>
                ) : messages.length === 0 ? (
                    <div className="partner-chat-empty">No messages yet.</div>
                ) : (
                    messages.map((message) => (
                        <PartnerMessageBubble
                            key={message.id}
                            message={message}
                            isMine={message.senderUserId === userId || (!userId && message.senderName === username)}
                            text={decryptedMessages[message.id]}
                            passphrase={passphrase}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <Form onSubmit={sendMessage} className="partner-compose">
                <Form.Control
                    as="textarea"
                    rows={3}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={isPartner ? "Send a message, update, reaction, or question..." : "Send a customer-facing project update..."}
                    disabled={!passphrase || sending || !canUseCrypto}
                />
                <div className="partner-compose-actions">
                    <label className="partner-file-button">
                        <Paperclip size={16} aria-hidden="true" />
                        <span>{files.length ? `${files.length} selected` : "Attach pictures"}</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={!passphrase || sending || !canUseCrypto}
                            onChange={(event) => setFiles(Array.from(event.target.files || []))}
                        />
                    </label>
                    <Button type="submit" variant="primary" disabled={sending || !passphrase || (!content.trim() && files.length === 0)}>
                        {sending ? <Spinner size="sm" /> : <Send size={16} aria-hidden="true" />}
                        Send
                    </Button>
                </div>
            </Form>
        </div>
    );
}

function PartnerMessageBubble({ message, isMine, text, passphrase }) {
    return (
        <div className={`partner-message-row ${isMine ? "partner-message-own" : ""}`}>
            <div className="partner-message-bubble">
                <div className="partner-message-meta">
                    <strong>{message.senderName || "User"}</strong>
                    <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</span>
                </div>
                <div className="partner-message-text">
                    {!passphrase ? "Encrypted message locked" : text === null ? "Could not decrypt with this key" : text}
                </div>
                {message.attachments?.length ? (
                    <div className="partner-attachments">
                        {message.attachments.map((attachment) => (
                            <EncryptedAttachment key={attachment.id || attachment.objectName} attachment={attachment} passphrase={passphrase} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function EncryptedAttachment({ attachment, passphrase }) {
    const [url, setUrl] = useState("");
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl = "";
        let alive = true;
        if (!passphrase || !attachment.downloadUrl || !attachment.iv || !attachment.salt) {
            setUrl("");
            return () => {};
        }
        (async () => {
            try {
                const blob = await decryptAttachmentBlob(attachment, passphrase);
                objectUrl = URL.createObjectURL(blob);
                if (alive) setUrl(objectUrl);
            } catch {
                if (alive) setFailed(true);
            }
        })();
        return () => {
            alive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [attachment, passphrase]);

    if (!passphrase) {
        return <span className="partner-attachment-chip"><Image size={14} aria-hidden="true" /> Locked image</span>;
    }
    if (failed) {
        return <span className="partner-attachment-chip">Could not decrypt image</span>;
    }
    if (!url) {
        return <span className="partner-attachment-chip"><Spinner size="sm" /> Decrypting image...</span>;
    }
    return (
        <a href={url} target="_blank" rel="noreferrer" className="partner-image-link">
            <img src={url} alt={attachment.originalName || "Encrypted attachment"} />
        </a>
    );
}
