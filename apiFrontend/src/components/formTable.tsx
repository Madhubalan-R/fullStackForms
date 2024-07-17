import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "../styles/formTable.css";

interface FormApiData {
  id: number;
  componentId: number;
  formLinkName: string;
  PermissionDetails: string;
  status: string;
  retryCount: number;
}

const App: React.FC = () => {
  const [forms, setForms] = useState<FormApiData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/forms');
      const data = response.data;
      if (Array.isArray(data)) {
        setForms(data);
      } else {
        setError('Invalid data format received from API');
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      setError('Failed to fetch form data');
    } finally {
      setLoading(false);
    }
  };

  const retryForm = async (id: number) => {
    try {
      const response = await axios.post(`/retryForms/${id}`); 
      const updatedForm = response.data;
      setForms((prevForms) =>
        prevForms.map((form) =>
          form.id === updatedForm.id ? updatedForm : form
        )
      );
    } catch (error) {
      console.error('Error retrying form data:', error);
      setError('Failed to retry form data');
    }
  };

  if (loading) {
    return <div className='loading'>Fetching Data...</div>;
  }

  if (error) {
    return <div className='loading'>Error: {error}</div>;
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Component ID</th>
            <th>Form Link Name</th>
            <th>Permission Details</th>
            <th>Status</th>
            <th>Action</th>
            <th>Retry Count</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <tr key={form.id}>
              <td>{form.id}</td>
              <td>{form.componentId}</td>
              <td>{form.formLinkName}</td>
              <td>{form.PermissionDetails}</td>
              <td>{form.status}</td>
              <td>
                {form.status === 'Failed' && form.retryCount < 5 && (
                  <button onClick={() => retryForm(form.id)}>Retry</button>
                )}
                {form.retryCount >= 5 && <span>Max retries reached</span>}
              </td>
              <td>{form.retryCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
