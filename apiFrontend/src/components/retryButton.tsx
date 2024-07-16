import React from 'react';
import { retryFailedForm } from '../services/api';
import "../styles/retryButton.css"

interface RetryButtonProps {
  formId: number;
}

const RetryButton: React.FC<RetryButtonProps> = ({ formId }) => {
  const handleRetry = async () => {
    await retryFailedForm(formId);
  };

  return <button onClick={handleRetry}>Retry</button>;
};

export default RetryButton;
