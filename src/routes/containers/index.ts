// filename: src/routes/containers/index.ts

import { Router } from 'express';
import listRouter from './list';
import inspectRouter from './inspect';
import logsRouter from './logs';
import streamRouter from './stream';
import stopRouter from './stop';
import startRouter from './start';
import removeRouter from './remove';
import execRouter from './exec';

const router = Router();

router.use('/', listRouter);       // GET /
router.use('/', inspectRouter);    // GET /:name
router.use('/', logsRouter);       // GET /:name/logs
router.use('/', streamRouter);     // GET /:name/logs/stream
router.use('/', stopRouter);       // POST /:name/stop
router.use('/', startRouter);      // POST /:name/start
router.use('/', removeRouter);     // DELETE /:name
router.use('/', execRouter);       // POST /:name/exec

export default router;