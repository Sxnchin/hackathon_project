import React from 'react';
import { motion } from 'framer-motion';

const PasswordStrengthIndicator = ({ score, feedback }) => {
  const getStrengthColor = (score) => {
    switch (score) {
      case 0: return '#ff4444';
      case 1: return '#ffbb33';
      case 2: return '#00C851';
      case 3: return '#007E33';
      default: return '#eee';
    }
  };

  const getStrengthText = (score) => {
    switch (score) {
      case 0: return 'Weak';
      case 1: return 'Fair';
      case 2: return 'Good';
      case 3: return 'Strong';
      default: return '';
    }
  };

  return (
    <div className="password-strength-container">
      <div className="strength-bars">
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            className="strength-bar"
            initial={{ scaleX: 0 }}
            animate={{ 
              scaleX: index < score ? 1 : 0,
              backgroundColor: getStrengthColor(score)
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      {feedback.length > 0 && (
        <motion.ul
          className="strength-feedback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {feedback.map((item, index) => (
            <li key={index}>Need {item}</li>
          ))}
        </motion.ul>
      )}
      {score > 0 && (
        <motion.span 
          className="strength-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {getStrengthText(score)}
        </motion.span>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;