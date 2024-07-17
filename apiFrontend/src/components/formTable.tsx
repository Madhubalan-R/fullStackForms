import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "../styles/formTable.css"

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
    setError(null);
    try {
      const response = await axios.get('/api/getAllForms');
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
    setLoading(true);
    setError(null);
    try {
      const accessToken = "1000.f8679d3ea27e10ba83a8c041c14b37a8.4e0b3e0e012cb173bde033cb1e51683b";
      const response = await axios.post(`http://localhost:3081/api/gddhh/${id}`, null, {
        params: { accessToken }
      });
      const updatedForm = response.data;
      setForms(forms.map(form => 
        form.id === updatedForm.id ? { ...form, ...updatedForm, retryCount: form.retryCount + 1 } : form
      ));
    } catch (error) {
      console.error('Error retrying form data:', error);
      setError('Failed to retry form data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {

    return <div className='loading'>Loading Process...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
                {form.status === 'Failed' && (
                  <button onClick={() => retryForm(form.id)}>Retry</button>
                )}
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
