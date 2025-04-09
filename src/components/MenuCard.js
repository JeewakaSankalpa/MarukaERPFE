import React from "react";
import {useNavigate} from "react-router-dom";

const MenuCard = ({ title, icon, path }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        backgroundColor: "#ffffff",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        width: "256px", // approx w-64
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "#e5e7eb", // gray-200
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontWeight: "600", fontSize: "18px", margin: "0 0 4px 0" }}>
        {title}
      </h3>
      
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#e5e7eb", // gray-200
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            backgroundColor: "#3b82f6", // blue-500
            width: "100%",
          }}
        ></div>
      </div>
    </div>
  );
};

export default MenuCard;