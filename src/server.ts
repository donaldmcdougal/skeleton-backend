import * as express from 'express';
import { writeFile } from 'fs';
import * as core from 'express-serve-static-core';
import * as bearerToken from 'express-bearer-token';
import * as bodyParser from 'body-parser';
import * as validator from 'express-validator';
import * as compression from 'compression';
import * as https from 'https';
import * as cluster from 'cluster';
import { AccountRouter } from './api/account-router';
import { EnvVariables } from './env-variables';
import * as dotenv from 'dotenv';
import { configure } from 'log4js';
configure('./config/log4js.json');

const numCPUs = require('os').cpus().length;

dotenv.config();
EnvVariables.init();

const PORT = process.env.PORT || 8472;

const app = express();

app.disable('X-Powered-By');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(bearerToken());
app.use(compression());
app.use((request: core.Request, response: core.Response, next: core.NextFunction) => {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  next();
});

const accountRouter = new AccountRouter();
accountRouter.defineRoutes(app);

const credentials: any = {
    key: process.env.SERVER_KEY,
    cert: process.env.SERVER_CERT,
    ca: process.env.SERVER_CA
};

if (cluster.isMaster) {

  console.log(`Master ${process.pid} started`);

  // write the master process pid to disk so when another instance of this code runs
  // it can read the pid and kill master process to start a brand new https server
  writeFile('pid.info', process.pid, (err) => {
    if (err) {
      return console.error(err);
    }
    console.log('PID for master process stored on disk');
  });

  console.log(`Creating ${numCPUs} worker(s)`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    console.log('===================================================================================================');
    console.log('Starting a new worker');
    console.log('===================================================================================================');
    cluster.fork();
  });

} else {
  https.createServer(credentials, app).listen(PORT, () => {
    console.log('===================================================================================================');
    console.log(`Worker ${process.pid} started and listening over https on port ${PORT}`);
    console.log('===================================================================================================');
  });
}
