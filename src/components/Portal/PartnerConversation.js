import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";
import { Image, Paperclip, Send, ShieldCheck } from "lucide-react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function PartnerConversation({ targetType, targetId, title, subtitle, listPath, postPath, onUnreadChanged }) {
    const { userId, username, userType } = useAuth();
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef(null);

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
            setError(e?.response?.data?.message || "Could not load this conversation.");
        } finally {
            setLoading(false);
        }
    }, [listPath, onUnreadChanged, targetId]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!content.trim() && files.length === 0) return;
        setSending(true);
        setError("");
        try {
            const attachments = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file, file.name);
                const res = await api.post(`/partner-communications/${targetType}/${targetId}/attachments`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                attachments.push(res.data);
            }

            const res = await api.post(postPath, { content: content.trim() || "[Attachment]", attachments });
            setMessages((prev) => [...prev, res.data]);
            setContent("");
            setFiles([]);
            onUnreadChanged?.();
        } catch (e) {
            setError(e?.response?.data?.message || "Could not send this message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="partner-chat">
            <div className="partner-chat-header">
                <div>
                    <div className="partner-chat-eyebrow">
                        <ShieldCheck size={14} aria-hidden="true" />
                        Account-restricted conversation
                    </div>
                    <h3>{title || "Chat and notifications"}</h3>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <Badge bg="success">Account scoped</Badge>
                </div>
            </div>

            <Alert variant="light" className="partner-chat-security">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Messages and pictures are shown only to the account linked to this project or order.</span>
            </Alert>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="partner-message-list" aria-live="polite">
                {loading ? (
                    <div className="partner-chat-empty"><Spinner size="sm" /> Loading conversation...</div>
                ) : messages.length === 0 ? (
                    <div className="partner-chat-empty">No messages yet.</div>
                ) : (
                    messages.map((message) => (
                        <PartnerMessageBubble
                            key={message.id}
                            message={message}
                            isMine={message.senderUserId === userId || (!userId && message.senderName === username)}
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
                    disabled={sending}
                />
                <div className="partner-compose-actions">
                    <label className="partner-file-button">
                        <Paperclip size={16} aria-hidden="true" />
                        <span>{files.length ? `${files.length} selected` : "Attach pictures"}</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={sending}
                            onChange={(event) => setFiles(Array.from(event.target.files || []))}
                        />
                    </label>
                    <Button type="submit" variant="primary" disabled={sending || (!content.trim() && files.length === 0)}>
                        {sending ? <Spinner size="sm" /> : <Send size={16} aria-hidden="true" />}
                        Send
                    </Button>
                </div>
            </Form>
        </div>
    );
}

function PartnerMessageBubble({ message, isMine }) {
    const text = message.content || (message.cipherText ? "Older locked message. Send a new message to use normal portal chat." : "");
    return (
        <div className={`partner-message-row ${isMine ? "partner-message-own" : ""}`}>
            <div className="partner-message-bubble">
                <div className="partner-message-meta">
                    <strong>{message.senderName || "User"}</strong>
                    <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</span>
                </div>
                <div className="partner-message-text">
                    {text}
                </div>
                {message.attachments?.length ? (
                    <div className="partner-attachments">
                        {message.attachments.map((attachment) => (
                            <PartnerAttachment key={attachment.id || attachment.objectName} attachment={attachment} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function PartnerAttachment({ attachment }) {
    if (!attachment.downloadUrl) {
        return <span className="partner-attachment-chip"><Image size={14} aria-hidden="true" /> Image unavailable</span>;
    }
    return (
        <a href={attachment.downloadUrl} target="_blank" rel="noreferrer" className="partner-image-link">
            <img src={attachment.downloadUrl} alt={attachment.originalName || "Attachment"} />
        </a>
    );
}
