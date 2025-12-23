import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Colors from "../../resources/Colors";
import { FaSignOutAlt } from "react-icons/fa";
import { Button } from "react-bootstrap";
import logo from "../../assets/logo.jpeg"; // ✅ Import your logo
import { useAuth } from "../../context/AuthContext"; // ✅ Access logged in user info

import { useNavigate } from "react-router-dom"; // Added
import api from "../../api/api"; // Added

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { username, role, userType, logout } = useAuth();
  const navigate = useNavigate(); // Added
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Unread Count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setUnreadCount(res.data || 0);
      } catch (e) { console.error(e); }
    };
    fetchCount();
    const poll = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(poll);
  }, []);

  return (
    <header style={styles.main} className="no-print">
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
        <div style={styles.notification} onClick={() => navigate("/notifications")}> {/* Added onClick */}
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
