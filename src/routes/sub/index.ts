// filename: src/routes/sub/index.ts

import { Router } from 'express';
import createRouter from './create';
import listRouter from './list';
import stopRouter from './stop';
import deleteRouter from './delete';
import logsRouter from './logs';
import statusRouter from './status';

const router = Router();

router.use('/', createRouter);      // POST /
router.use('/', listRouter);        // GET /
router.use('/', stopRouter);        // POST /:name/stop
router.use('/', deleteRouter);      // DELETE /:name
router.use('/', logsRouter);        // GET /:name/logs
router.use('/', statusRouter);      // GET /:name/status

export default router;