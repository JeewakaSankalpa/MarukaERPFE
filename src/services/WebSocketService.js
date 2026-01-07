import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const baseURL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' && window.__API_URL__) || 'http://localhost:8080/api';
// Remove /api if present at end (since /ws is usually peer to /api, not child)
const wsBase = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
const SOCKET_URL = `${wsBase}/ws`;

class WebSocketService {
    constructor() {
        this.client = new Client({
            webSocketFactory: () => new SockJS(SOCKET_URL),
            debug: (str) => {
                // console.log(str); // Uncomment for debug
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };
    }

    connect(onConnected, onError) {
        this.client.onConnect = (frame) => {
            console.log('Connected to WebSocket');
            if (onConnected) onConnected();
        };

        this.client.onWebSocketClose = () => {
            if (onError) onError();
        };

        this.client.activate();
    }

    subscribe(topic, callback) {
        if (!this.client.connected) {
            console.warn("WebSocket not connected. Cannot subscribe to " + topic);
            return null;
        }

        return this.client.subscribe(topic, (message) => {
            try {
                const payload = JSON.parse(message.body);
                callback(payload);
            } catch (e) {
                console.error("Failed to parse WebSocket message", e);
                callback(message.body);
            }
        });
    }

    send(destination, body) {
        if (this.client.connected) {
            this.client.publish({
                destination: destination,
                body: JSON.stringify(body)
            });
        } else {
            console.warn("WebSocket not connected. Cannot send to " + destination);
        }
    }

    disconnect() {
        this.client.deactivate();
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
