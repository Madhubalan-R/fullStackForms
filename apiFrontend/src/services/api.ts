import axios from 'axios';

const API_URL = 'http://localhost:3081/api';

export const getAllForms = async () => {
  const response = await axios.get(`${API_URL}/getAllForms`);
  return response.data;
};

export const retryFailedForm = async (formId: number) => {
  await axios.post(`${API_URL}/retryFailedForm`,{formId});
};

