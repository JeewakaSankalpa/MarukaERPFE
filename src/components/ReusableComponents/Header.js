import React, { useEffect, useState } from "react";
import { Bell, Command as CmdIcon } from "lucide-react";
import Colors from "../../resources/Colors";
import { FaSignOutAlt } from "react-icons/fa";
import { Button } from "react-bootstrap";
import logo from "../../assets/logo.jpeg";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
// WebSocket & Command Palette
import webSocketService from "../../services/WebSocketService";
import CommandPalette from "./CommandPalette";
import { toast } from "react-toastify";
import "./CommandPalette.css"; // Ensure styles are loaded

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { username, userId, role, userType, logout } = useAuth(); // Assume userId/id is available in AuthContext now
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Unread Count (Initial)
  const fetchCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    // If AuthContext doesn't provide userId directly, you might need to decode token or fetch profile.
    // Assuming 'username' is unique or we fetch profile first.
    // For now, let's try to use username if userId is missing, or best effort.
    // Update: NotificationService pushes to /topic/notifications/{userId}.
    // We need the ACTUAL DB userId here. 
    // If not available in context, we might need to fetch /user/me first.
    // Let's assume username is the ID for now or we fetch it.

    // Better approach: fetch profile to get ID
    let activeSub = null;

    const connectWS = async () => {
      try {
        // We might need the User ID to subscribe to personal topic
        // const profile = await api.get('/user/profile'); 
        // const uid = profile.data.id; 
        // For prototype, assuming username == userId or passed in context
        const uid = userId || username;

        webSocketService.connect(() => {
          // Subscribe to personal notifications
          activeSub = webSocketService.subscribe(`/topic/notifications/${uid}`, (notification) => {
            // On receive
            console.log("WS Notification:", notification);
            toast.info(`New: ${notification.title}`);
            setUnreadCount(prev => prev + 1);
          });
        });
      } catch (e) { console.error("WS Setup Failed", e); }
    };

    connectWS();

    return () => {
      if (activeSub) activeSub.unsubscribe();
      // webSocketService.disconnect(); // Keep connection alive if shared? Or disconnect on logout/unmount
    };
  }, [username, userId]);

  return (
    <header style={styles.main} className="no-print">
      <CommandPalette /> {/* Mount Global Command Palette */}

      {/* Left Section - Logo */}
      <div style={styles.leftSection}>
        <img src={logo} alt="Maruka Logo" style={styles.logoImage} />
      </div>

      {/* Center Section - Profile Info */}
      <div style={styles.centerSection}>
        <div style={styles.profile}>
          <img
            src={`https://ui-avatars.com/api/?name=${username || "User"}&background=3b82f6&color=fff`}
            alt="User"
            style={styles.profilePicture}
          />
          <div>
            <h3 style={styles.profileName}>{username || "User"}</h3>
            <p style={styles.profileDetails}>
              {role || userType || ""}
            </p>
          </div>
        </div>

        <span style={styles.dateTime}>
          {currentTime.toLocaleTimeString()} &nbsp; {new Date().toLocaleDateString()}
        </span>
      </div>

      {/* Right Section - Notifications & Logout */}
      <div style={styles.rightSection}>

        {/* Search Trigger Hint */}
        <div
          className="d-none d-md-flex align-items-center text-white-50 small border border-secondary rounded px-2 py-1"
          style={{ cursor: 'pointer' }}
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        >
          <CmdIcon size={14} className="me-1" /> <span style={{ fontSize: '12px' }}>Ctrl+K</span>
        </div>

        <div style={styles.notification} onClick={() => navigate("/notifications")}>
          <Bell size={20} color={Colors.white} />
          {unreadCount > 0 && <span style={styles.notificationCount}>{unreadCount}</span>}
        </div>
        <Button variant="danger" onClick={logout}>
          <FaSignOutAlt /> Logout
        </Button>
      </div>
    </header>
  );
};

const styles = {
  main: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    backgroundColor: `${Colors.sideBar}`,
    height: "4rem",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoImage: {
    height: "40px",
    width: "auto",
    borderRadius: "5px",
    objectFit: "contain",
  },
  centerSection: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  notification: {
    position: "relative",
    cursor: "pointer",
  },
  notificationCount: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    backgroundColor: "#ef4444",
    color: "white",
    fontSize: "0.625rem",
    borderRadius: "9999px",
    padding: "2px 5px",
    fontWeight: "bold",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  profilePicture: {
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "9999px",
    objectFit: "cover",
  },
  profileName: {
    fontWeight: "600",
    fontSize: "0.875rem",
    margin: "0 0 2px 0",
    color: `${Colors.white}`,
  },
  profileDetails: {
    fontSize: "0.75rem",
    color: `${Colors.white}`,
    margin: 0,
  },
  dateTime: {
    color: `${Colors.white}`,
  },
};

export default Header;
