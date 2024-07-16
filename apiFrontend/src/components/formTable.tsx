import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "../styles/formTable.css"

interface FormApiData {
  id: number;
  componentId: number;
  formLinkName: string;
  PermissionDetails: string;
  status: string;
}

const App: React.FC = () => {
  const [forms, setForms] = useState<FormApiData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/forms')
      .then((response) => {
        const data = response.data;
        if (Array.isArray(data)) {
          setForms(data);
        } else {
          setError('Invalid data format received from API');
        }
      })
      .catch((error) => {
        console.error('Error fetching form data:', error);
        setError('Failed to fetch form data');
      });
  }, []);

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
              <td>0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  async function retryForm(id: number) {
    try {
      await axios.post('http://localhost:3081/api/retryForms', { id });
      // Refresh the form data after retry
      const response = await axios.get('http://localhost:3081/api/forms');
      setForms(response.data);
    } catch (error:any) {
      console.error('Error retrying form data:', error.response || error.message || error);
      setError('Failed to retry form data');
    }
  }
};

export default App;

