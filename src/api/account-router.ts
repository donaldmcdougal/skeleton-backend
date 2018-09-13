import * as core from 'express-serve-static-core';
import { getLogger, Logger } from 'log4js';
import { Login } from './class/login';
import { Token } from './class/token';

export class AccountRouter {

    defineRoutes(app: core.Express) {

        const login: Login = new Login();
        const logger: Logger = getLogger('http');
        logger.level = process.env.LOGGER_LEVEL;

        app.get('/api/account/verify', (req: core.Request, res: core.Response) => {
            logger.debug('Verifying account');
            login.verifyToken(req).then(msg => {
                res.json(msg);
            });
        });

        app.get('/api/account/verify/admin', (req: core.Request, res: core.Response) => {
            logger.debug('Verifying admin account');
            login.verifyAdminToken(req).then(msg => {
                res.json(msg);
            });
        });

        app.get('/api/accounts', (req: core.Request, res: core.Response) => {
            logger.debug('Getting all accounts');
            Token.verifyAdminToken(req).then(msg => {
                if (msg.success === 1) {
                    login.getAllAccounts().then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            })
        });

        app.get('/api/account', (req: core.Request, res: core.Response) => {
            logger.debug('Getting the current account');
            Token.verifyToken(req).then(msg => {
                if (msg.success === 1) {
                    login.getAccount(msg.data[0].email).then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.get('/api/admin/account/:id', (req: core.Request, res: core.Response) => {
            logger.debug('Getting account by id');
            Token.verifyAdminToken(req).then(msg => {
                if (msg.success === 1) {
                    login.getAccountById(req.params.id).then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.post('/api/account', (req: core.Request, res: core.Response) => {
            logger.debug('Creating new account');
            Token.verifyAdminToken(req).then(msg => {
                if (msg.success === 1) {
                    login.create(req.body.first_name, req.body.last_name, req.body.email, req.body.email_confirm,
                        req.body.password, req.body.password_confirm, req.body.company_id, req.body.admin).then(msg => {
                        res.json(msg);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.put('/api/account', (req: core.Request, res: core.Response) => {
            logger.debug('Updating current account');
            Token.verifyToken(req).then(msg => {
                if (msg.success === 1) {
                    login.update(req.body.first_name, req.body.last_name, msg.data[0].email).then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.put('/api/admin/account/:id', (req: core.Request, res: core.Response) => {
            logger.debug('Updating account by id');
            Token.verifyAdminToken(req).then(msg => {
                if (msg.success === 1) {
                    login.updateById(req.body.first_name, req.body.last_name, req.body.admin, req.params.id).then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.put('/api/account/password', (req: core.Request, res: core.Response) => {
            logger.debug('Updating current account password');
            Token.verifyToken(req).then(msg => {
                if (msg.success === 1) {
                    login.updatePassword(req.body.password, req.body.password_confirm, msg.data[0].email).then(msg2 => {
                        res.json(msg2);
                    });
                } else {
                    res.json(msg);
                }
            });
        });

        app.post('/api/account/reset/password', (req: core.Request, res: core.Response) => {
            logger.debug('Requesting password reset');
            login.requestPasswordReset(req.body.email).then(msg => {
                res.json(msg);
            });
        });

        app.put('/api/account/reset/password/:reset_key', (req: core.Request, res: core.Response) => {
            logger.debug('Resetting password');
            login.updatePasswordUsingResetKey(req.body.password, req.body.password_confirm, req.params.reset_key).then(msg => {
                res.json(msg);
            });
        });

        app.post('/api/account/activate', (req: core.Request, res: core.Response) => {
            logger.debug('Activating account');
            login.activateAccount(req.body.activation_key).then(msg => {
                res.json(msg);
            });
        });

        app.delete('/api/account/:id', (req: core.Request, res: core.Response) => {
            logger.debug('Deleting account');
            Token.verifyAdminToken(req).then(msg => {
                if (msg.success === 1) {
                    login.remove(req.params.id).then(msg2 => {
                        res.json(msg2);
                    })
                } else {
                    res.json(msg);
                }
            });
        });

        app.post('/api/login', (req: core.Request, res: core.Response) => {
            logger.debug('Logging in');
            login.signIn(req.body.email, req.body.password).then(msg => {
                res.json(msg);
            }).catch(err => {
                console.log(err);
            });
        });
    }
}
