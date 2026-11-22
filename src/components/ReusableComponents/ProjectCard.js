// import React from "react";

// const ProjectCard = ({ title, team, timeLeft, progress, icon }) => {
//     return (
//         <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-start w-64">
//             <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full mb-2">
//                 {icon}
//             </div>
//             <h3 className="font-semibold text-lg">{title}</h3>
//             <p className="text-gray-500 text-sm">{team}</p>
//             <p className="text-gray-500 text-sm mb-2">{timeLeft} Left</p>
//             <div className="w-full h-2 bg-gray-200 rounded-md overflow-hidden">
//                 <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
//             </div>
//             <p className="text-sm text-gray-600 mt-1">Progress: {progress}%</p>
//         </div>
//     );
// };

// export default ProjectCard;

// -----------------------------------------------------------------------------------------------------------------

// import React from "react";
// import PropTypes from "prop-types";

// const ProjectCard = ({ title, team, timeLeft, progress, icon }) => {
//     // Clamp progress between 0 and 100
//     const safeProgress = Math.max(0, Math.min(progress, 100));

//     return (
//         <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-start w-full sm:w-64">
//             <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full mb-2">
//                 {icon}
//             </div>
//             <h3 className="font-semibold text-lg">{title}</h3>
//             <p className="text-gray-500 text-sm">{team}</p>
//             <p className="text-gray-500 text-sm mb-2">{timeLeft} Left</p>
//             <div className="w-full h-2 bg-gray-200 rounded-md overflow-hidden">
//                 <div className="h-full bg-blue-500" style={{ width: `${safeProgress}%` }}></div>
//             </div>
//             <p className="text-sm text-gray-600 mt-1">Progress: {safeProgress}%</p>
//         </div>
//     );
// };

// // Prop validation
// ProjectCard.propTypes = {
//     title: PropTypes.string.isRequired,
//     team: PropTypes.string.isRequired,
//     timeLeft: PropTypes.string.isRequired,
//     progress: PropTypes.number.isRequired,
//     icon: PropTypes.element.isRequired,
// };

// // Optional: Default props
// ProjectCard.defaultProps = {
//     progress: 0,
// };

// export default ProjectCard;

// ----------------------------------------------------------------------------------------------------

import React from "react";
import { useNavigate } from "react-router-dom";

const ProjectCard = ({ title, team, icon, path }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <button
      type="button"
      className="dashboard-quick-action"
      onClick={handleCardClick}
      disabled={!path}
      aria-label={`${title}: ${team}`}
    >
      <span className="dashboard-quick-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="dashboard-quick-copy">
        <strong>{title}</strong>
        <span>{team}</span>
      </span>
      <span className="dashboard-quick-arrow" aria-hidden="true">→</span>
    </button>
  );
};

export default ProjectCard;
