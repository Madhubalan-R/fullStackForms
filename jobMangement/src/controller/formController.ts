import cron from 'node-cron';
import { Request, Response } from 'express';
import { AppDataSource } from '../dbconfig';
import { FormApiData, FormStatus } from '../entites/FormApiData';
import axios from 'axios';
import { WebSocket, WebSocketServer } from 'ws';

interface CustomRequest extends Request {
  accessToken?: string;
}
 let wss: WebSocketServer;

 export const setWebSocketServer = (server: WebSocketServer)=>{
  wss = server;
 };

 const sendWebSocketMessage = (message: any)=>{
  if(!wss){
    console.error('Web socket server is not initialized');
    return;
  }
  wss.clients.forEach((client)=>{
    if(client.readyState === WebSocket.OPEN){
      client.send(JSON.stringify(message));
    }
  });
 };

 const saveFormApiData = async (
  repository: any,
  componentId: number,
  formLinkName: string,
  permissionDetails: string,
  status: FormStatus,
  savedForms: FormApiData[]
 ) => {
  try{
      const formApiData = new FormApiData();
      formApiData.componentId = componentId;
      formApiData.formLinkName = formLinkName;
      formApiData.PermissionDetails = permissionDetails;
      formApiData.status = status;

      await repository.save(formApiData);
      sendWebSocketMessage({status});
      savedForms.push(formApiData);
  }
  catch(error){
    console.error('Error saving form data', error);
   throw error;
  }
 };

 export const getForms = async (req: CustomRequest, res: Response) => {
  const accessToken = req.accessToken;
  console.log("AccessToken", accessToken);
  if (!accessToken) {
    return res.json({ error: 'Access token is missing' });
  }

  try {
    const FormApiDataRepository = AppDataSource.getRepository(FormApiData);

    // Fetch data from external API
    const response = await axios.get('https://people.zoho.com/people/api/forms', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.data || !response.data.response.result) {
      sendWebSocketMessage({ status: FormStatus.FAILED });
      return res.status(404).json({ error: 'Form data not found' });
    }

    const apiData = response.data?.response?.result ?? [];

    if (apiData.length === 0) {
      sendWebSocketMessage({ status: FormStatus.FAILED });
      return res.json({ error: 'No forms found' });
    }

    const savedForms: FormApiData[] = [];

    for (const api of apiData) {
      const componentId = api.componentId ? parseInt(api.componentId, 10) : 0;
      const formLinkName = api.formLinkName || '';
      const permissionDetails = api.PermissionDetails ? JSON.stringify(api.PermissionDetails) : '';

      if (!isNaN(componentId) && formLinkName && permissionDetails) {
        try {
          await saveFormApiData(FormApiDataRepository, componentId, formLinkName, permissionDetails, FormStatus.ADDED, savedForms);
          await saveFormApiData(FormApiDataRepository, componentId, formLinkName, permissionDetails, FormStatus.IN_PROGRESS, savedForms);

          const processedStatus = processData() ? FormStatus.COMPLETED : FormStatus.FAILED;
          await saveFormApiData(FormApiDataRepository, componentId, formLinkName, permissionDetails, processedStatus, savedForms);
        } catch (error) {
          console.error('Error saving form data:', error);
          return res.status(500).json({ error: 'Failed to save form data' });
        }
      }
    }
    return res.json(savedForms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    sendWebSocketMessage({ status: FormStatus.FAILED });
    return res.status(500).json({ error: 'Failed to fetch forms data' });
  }
};

const processData = () => {
  const randomSuccess = Math.random() >= 0.2;// 80% chance of  success
  return randomSuccess;
};

export const retryFailedForms = async (accessToken: string) => {
  const FormApiDataRepository = AppDataSource.getRepository(FormApiData);
  const failedForms = await FormApiDataRepository.find({ where: { status: FormStatus.FAILED } });

  for (const form of failedForms) {
     // Retry up to 5 times
    if (form.retryCount < 5) {
      try {
        form.status = FormStatus.RETRY;
        form.retryCount += 1;
        await FormApiDataRepository.save(form);
       sendWebSocketMessage({ status: FormStatus.RETRY, id:form.id });

        const response = await axios.get('https://people.zoho.com/people/api/forms', {
          headers: {
            Authorization: `Bearer ${accessToken}`, 
          },
        });

        if (!response.data || !response.data.response.result) {
          form.status = FormStatus.FAILED;
          await FormApiDataRepository.save(form);
          sendWebSocketMessage({ status: FormStatus.FAILED, id:form.id });

          continue;

        }
        const apiData =response.data.response.result;
        for(const api of apiData){
          const componentId = api.componentId ? parseInt(api.componentId, 10) : 0;
          const formLinkName = api.formLinkName || '';
          const permissionDetails = api.PermissionDetails ? JSON.stringify(api.PermissionDetails) : '';

          if (!isNaN(componentId) && formLinkName && permissionDetails) {
            const newFormApiData = new FormApiData();
            newFormApiData.componentId = componentId;
            newFormApiData.formLinkName = formLinkName;
            newFormApiData.PermissionDetails = permissionDetails;
            newFormApiData.status = FormStatus.COMPLETED;
            await FormApiDataRepository.save(newFormApiData); 
            sendWebSocketMessage({ status: FormStatus.COMPLETED, id:form.id });

          }
        }
         
      } catch (error) {
        console.error('Error retrying form data fetch:', error);
        form.status = FormStatus.FAILED;
        await FormApiDataRepository.save(form); // Update status to FAILED
        sendWebSocketMessage({ status: FormStatus.FAILED, id:form.id });

      }
    } else {
      console.log(`Form with ID ${form.id} has reached the maximum retry limit.`);
      sendWebSocketMessage({ status: 'Maximum Retries Reached',id:form.id});
    }
  }
};

export const retryFailedFormsEndpoint = async (req: Request, res: Response) => {
  const accessToken = req.query.accessToken as string;
  if(!accessToken){
    return res.status(400).json({ error: 'Access token is missing'});
  }
  try {
    await retryFailedForms(accessToken);
    res.status(200).json({ message: 'Retry process completed.' });
  } catch (error) {
    console.error('Error during retry process:', error);
    res.status(500).json({ error: 'Retry process failed.' });
  }
};

// Schedule the retry process to run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled retry process...');
  const accessToken = '1000.f8679d3ea27e10ba83a8c041c14b37a8.4e0b3e0e012cb173bde033cb1e51683b';

  await retryFailedForms(accessToken);
});

export const getFormById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const FormApiDataRepository = AppDataSource.getRepository(FormApiData);
    const form = await FormApiDataRepository.findOne({ where: { id: parseInt(id) } });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form data by ID:', error);
    res.status(500).json({ error: 'Failed to fetch form data' });
  }
};

export const getAllForms = async (req: Request, res: Response) => {
  try {
    const FormApiDataRepository = AppDataSource.getRepository(FormApiData);
    const forms = await FormApiDataRepository.find();
  
    res.json(forms);
  } catch (error) {
    console.error('Error fetching all forms:', error);
    res.status(500).json({ error: 'Failed to fetch all forms' });
  }
};
export const updateFormStatus = async(id: number, status:FormStatus) => {
  const formApiDataRepository = AppDataSource.getRepository(FormApiData);
  const form = await formApiDataRepository.findOne({where:{ id }});

  if(form){
      form.status = status;
      await formApiDataRepository.save(form);
  }
  else{
    console.error(`Form with id ${id} not found`);
  }
};