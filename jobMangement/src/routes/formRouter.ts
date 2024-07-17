import { refreshTokenMiddleware } from "../middelware/tokenMiddleware";
import {getAllForms, getFormById, getForms, retryFailedForms} from "../controller/formController"
import { Router } from "express";
import { getToken } from '../service/zohoServices';


const router = Router();
router.use(refreshTokenMiddleware);

router.get('/getAccessToken', getToken)
router.get('/forms',getForms);
router.post('/retryForms/:id',retryFailedForms);
router.get('/getAllForms',getAllForms);
router.get('/:id', getFormById);

export default router;