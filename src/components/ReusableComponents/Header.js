import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Colors from "../../resources/Colors";
import { FaClock, FaSignOutAlt, FaStore, FaUser } from "react-icons/fa";
import { Button } from "react-bootstrap";

const Header = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={styles.main}>
      {/* Left Section - Logo */}
      <div style={styles.leftSection}>
        <div style={styles.logo}>M</div>
        <h2 style={styles.name}>Maruka</h2>
      </div>

      {/* Center Section - Search */}
      <div style={styles.centerSection}>
        {/* <input type="text" placeholder="Search ..." style={styles.searchBar} /> */}
        {/* <FaUser />{" "} */}
        {/* <span>
          <h3>Didula Tharuka</h3>
          {user.firstName} {user.lastName}
        </span> */}
        {/* <FaStore />{" "} */}
        {/* <span>
          {user.s/tore}
          <h3>nugegoda</h3>
        </span> */}
        <div style={styles.profile}>
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            style={styles.profilePicture}
          />
          <div>
            <h3 style={styles.profileName}>Augusta Ryan</h3>
            <p style={styles.profileDetails}>Director</p>
          </div>
        </div>
        <FaClock />{" "}
        <span>
          {currentTime.toLocaleTimeString()}&nbsp;&nbsp;&nbsp;
          {new Date().toLocaleDateString()}
        </span>
      </div>

      {/* Right Section - Notifications & Profile */}
      <div style={styles.rightSection}>
        <div style={styles.notification}>
          <Bell size={20} />
          <span style={styles.notificationCount}>1</span>
        </div>
        {/* <div style={styles.profile}>
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            style={styles.profilePicture}
          />
          <div>
            <h3 style={styles.profileName}>Augusta Ryan</h3>
            <p style={styles.profileDetails}>Director</p>
          </div>
        </div> */}
        <Button
          variant="danger"
          //  onClick={handleLogout}
        >
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
    // borderBottom: "1px solid #e5e7eb",
    backgroundColor: `${Colors.light}`,
    // backgroundColor: "#ffffff",
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
  logo: {
    backgroundColor: "#3b82f6",
    color: "white",
    borderRadius: "9999px",
    width: "2rem",
    height: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  name: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  centerSection: {
    display: "flex",
    gap: "20px",
    // flex: 1,
    // maxWidth: "400px",
    // marginLeft: "2rem",
    // marginRight: "2rem",
  },
  searchBar: {
    width: "100%",
    padding: "0.5rem 1rem",
    borderRadius: "0.375rem",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontSize: "0.875rem",
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
    color: "#1f2937",
  },
  profileDetails: {
    fontSize: "0.75rem",
    color: "#6b7280",
    margin: 0,
  },
};

export default Header;
