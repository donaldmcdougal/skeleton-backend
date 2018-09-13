import { format } from 'mysql';
import * as jwt from 'jsonwebtoken';
const Promise = require('bluebird');
import * as core from 'express-serve-static-core';
import { Database } from '../common/db-pool';
import { ResponseMessage } from '../../common/response-message';
import { Token } from './token';
import { Email } from './email';
import { getLogger, Logger } from 'log4js';

export class Login {

    private errorLogger: Logger = getLogger('default');
    private opsLogger: Logger = getLogger('ops');

    verifyToken(req: core.Request): Promise<boolean> {
        const _this = this;
        const authHeadersSplit = req.headers.authorization.split(' ');
        if (authHeadersSplit[0] !== 'Bearer' || authHeadersSplit.length !== 2) {
            _this.opsLogger.info('Authorization token not found');
            return new Promise((resolve, reject) => {
                resolve(false);
            });
        } else {
            const token = authHeadersSplit[1];
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
                const email = decoded.email;
                let sql: string = 'select * from ?? where ?? = lower(trim(?)) and ?? = ?';
                const params: any[] = ['user', 'email', email, 'deleted', 0];
                sql = format(sql, params);
                return Promise.using(Database.getSqlConnection(), (connection) => {
                    return connection.query(sql).then((rows) => {
                        if (rows.length > 0) {
                            _this.opsLogger.debug('Token verified');
                        } else {
                            _this.opsLogger.debug('Token verify failed');
                        }
                        return rows.length > 0;
                    }).catch((error) => {
                        _this.errorLogger.error(error);
                        return false;
                    });
                });
            } catch (err) {
                return new Promise((resolve, reject) => {
                    return resolve(false);
                });
            }
        }
    }

    verifyAdminToken(req: core.Request): Promise<boolean> {
        const _this = this;
        const authHeadersSplit = req.headers.authorization.split(' ');
        if (authHeadersSplit[0] !== 'Bearer' || authHeadersSplit.length !== 2) {
            _this.opsLogger.info('Authorization token not found');
            return new Promise((resolve, reject) => {
                resolve(false);
            });
        } else {
            const token = authHeadersSplit[1];
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
                const email = decoded.email;
                let sql = `select u.* from user as u
                inner join user_authority as ua on u.id = ua.user_id
                inner join authority as a on a.id = ua.authority_id
                where a.name = 'ROLE_ADMIN'
                and u.deleted = 0
                and u.email = lower(trim(?))`;
                const params: any[] = [email];
                sql = format(sql, params);
                return Promise.using(Database.getSqlConnection(), (connection) => {
                    return connection.query(sql).then((rows) => {if (rows.length > 0) {
                        _this.opsLogger.debug('Admin token verified');
                    } else {
                        _this.opsLogger.debug('Admin token verify failed');
                    }
                        return rows.length > 0;
                    }).catch((error) => {
                        _this.errorLogger.error(error);
                        return false;
                    });
                });
            } catch (err) {
                return new Promise((resolve, reject) => {
                    return resolve(false);
                });
            }
        }
    }

    create(firstName: string, lastName: string, email: string, emailConfirm: string,
                  password: string, passwordConfirm: string, companyId: number, admin: boolean): Promise<ResponseMessage> {
        const obj = new ResponseMessage();
        const _this = this;
        const messages: string[] = [];

        if (!firstName || firstName.trim().length === 0) {
            messages.push('You must provide your first name.');
        }

        if (!lastName || lastName.trim().length === 0) {
            messages.push('You must provide your last name.');
        }

        if (!email || email.trim().length === 0) {
            messages.push('You must provide your email address.');
        }

        if (!emailConfirm || emailConfirm.trim().length === 0) {
            messages.push('You must provide your email address confirmation.');
        }

        if (email !== emailConfirm) {
            messages.push('Email and email confirmation must match.');
        }

        if (!password || password.trim().length === 0) {
            messages.push('You must provide a password.');
        }

        if (!passwordConfirm || passwordConfirm.trim().length === 0) {
            messages.push('You must provide a password confirmation.');
        }

        if (password !== passwordConfirm) {
            messages.push('Password and password confirmation must match.');
        }

        if (companyId < 1) {
            messages.push('You must provide a valid company.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'select * from ?? where ?? = lower(trim(?))';
            let params: any[] = ['user', 'email', email];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(), (connection) => {
                const activationKey = Login.makeRandomString(20);
                return connection.query(sql).then((rows: any[]) => {
                    if (rows.length > 0) {
                        _this.opsLogger.info('Account creation failed - email is already registered');
                        obj.success = 0;
                        obj.data.push('Email is already registered.');
                        return obj;
                    } else {
                        _this.opsLogger.debug('Creating user');
                        sql = 'insert into ?? (??, ??, ??, ??, ??, ??, ??, ??, ??, ??) ' +
                            'values (lower(trim(?)), trim(?), trim(?), sha2(?, 512), ?, ?, ?, ?, current_timestamp, ?)';
                        params = ['user', 'email', 'first_name', 'last_name', 'password_hash', 'activated', 'company_id',
                            'activation_key', 'created_by', 'created_date', 'deleted',
                            email, firstName, lastName, password, 0, companyId, activationKey, 'system',
                            0];
                        sql = format(sql, params);
                        return connection.query(sql).then((rows) => {
                            _this.opsLogger.debug('Creating role for user');
                            sql = 'insert into ?? (??, ??) values (?, ?)';
                            params = ['user_authority', 'user_id', 'authority_id', rows.insertId, 2];
                            sql = format(sql, params);
                            connection.query(sql);
                            if (admin) {
                                sql = 'insert into ?? (??, ??) values (?, ?)';
                                params = ['user_authority', 'user_id', 'authority_id', rows.insertId, 1];
                                sql = format(sql, params);
                                connection.query(sql);
                            }
                        });
                    }
                }).then((rows: any[]) => {
                    const activateUrl = process.env.BASE_WEB_CLIENT_URL + 'activate/' + activationKey;
                    const text = 'A new account has been created for you at ' + process.env.BASE_WEB_CLIENT_URL + '.  To activate this account, please visit ' + activateUrl + '.';
                    const html = '<h3>A new account has been created for you at <a href="' + process.env.BASE_WEB_CLIENT_URL + '">DonaldMcDougal.com</a></h3>. ' +
                        '<p>To activate this account, please visit <a href="' + activateUrl + '">' + activateUrl + '</a></p>';
                    Email.sendEmail(process.env.CONTACT_EMAIL, [email], [], 'DonaldMcDougal.com account creation',
                        text, html).then(() => {
                        obj.success = 1;
                        obj.data.push('Account created.  Please check your email to activate your account.');
                        return obj;
                    }).then(msg => {
                        if (msg.success === 0) {
                            _this.errorLogger.error(msg.data[0]);
                        } else {
                            _this.opsLogger.debug('Email sent.');
                        }
                    }).catch((error) => {
                        _this.errorLogger.error(error);
                    });
                    _this.opsLogger.debug('Account created');
                    obj.success = 1;
                    obj.data.push('Account created.  Please check your email to activate your account.');
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push('User creation failed.');
                    return obj;
                });
            });
        }
    }

    signIn(email: string, password: string): Promise<ResponseMessage> {
        const obj = new ResponseMessage();
        const _this = this;

        if (!email || email.trim().length === 0) {
            obj.data.push('You must provide your email address.');
        }

        if (!password || password.trim().length === 0) {
            obj.data.push('You must provide your password.');
        }

        if (obj.data.length > 0) {
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        }

        let sql = 'select * from ?? where ?? = lower(trim(?)) and ?? = sha2(?, 512) and deleted = 0';
        let params: any[] = ['user', 'email', email, 'password_hash', password];
        sql = format(sql, params);
        return Promise.using(Database.getSqlConnection(), (connection) => {
            return connection.query(sql).then((rows) => {
                if (rows.length > 0) {
                    if (rows[0].activated === 0) {
                        _this.opsLogger.debug('Account not activated');
                        obj.success = 0;
                        obj.data.push('You must activate your account to continue.  Please check your email for instructions on how to do so.');
                    } else {
                        _this.opsLogger.debug('Log in successful');
                        obj.success = 1;
                        obj.data.push(Token.getToken(email));
                    }
                } else {
                    _this.opsLogger.info('Authentication failed');
                    obj.success = 0;
                    obj.data.push('Authentication failed.');
                }
                return obj;
            }).catch((error) => {
                _this.errorLogger.error(error);
                obj.success = 0;
                return obj;
            });
        });
    }

    getAccountById(id: number): Promise<ResponseMessage> {
        const obj = new ResponseMessage();
        const _this = this;

        if (id < 1) {
            obj.data.push('You must provide a valid user ID.');
        }

        if (obj.data.length > 0) {
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        }

        let sql = 'select user.*, exists(select authority.name as role_name from user ' +
            'inner join user_authority on user_authority.user_id = user.id ' +
            'inner join authority on user_authority.authority_id = authority.id ' +
            'where authority.name = ? and user.id = ?) as is_admin from user ' +
            'where user.id = ? and user.deleted = 0';
        const params = ['ROLE_ADMIN', id, id];
        sql = format(sql, params);

        return Promise.using(Database.getSqlConnection(), (connection) => {
            return connection.query(sql).then((rows: any[]) => {
                if (rows.length > 0) {
                    _this.opsLogger.debug('Account retrieved');
                    obj.success = 1;
                    obj.data.push(rows[0]);
                } else {
                    _this.opsLogger.debug('Account not found.');
                    obj.data.push('User not found.');
                }
                return obj;
            }).catch((error) => {
                _this.errorLogger.error(error);
                obj.success = 0;
                return obj;
            });
        });
    }

    getAccount(email: string): Promise<ResponseMessage> {
        const obj = new ResponseMessage();
        const _this = this;

        if (!email || email.trim().length === 0) {
            obj.data.push('You must provide your email address.');
        }

        if (obj.data.length > 0) {
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        }

        let sql = 'select user.*, exists(select authority.name as role_name from user ' +
            'inner join user_authority on user_authority.user_id = user.id ' +
            'inner join authority on user_authority.authority_id = authority.id ' +
            'where authority.name = ? and user.email = lower(trim(?))) as is_admin from user ' +
            'where user.email = lower(trim(?)) and user.deleted = 0';
        const params = ['ROLE_ADMIN', email, email];
        sql = format(sql, params);
        return Promise.using(Database.getSqlConnection(), (connection) => {
            return connection.query(sql).then((rows: any[]) => {
                if (rows.length > 0) {
                    _this.opsLogger.debug('Account retrieved');
                    obj.success = 1;
                    obj.data.push(rows[0]);
                } else {
                    _this.opsLogger.debug('Account not found');
                    obj.data.push('User not found.');
                }
                return obj;
            }).catch((error) => {
                _this.errorLogger.error(error);
                obj.success = 0;
                return obj;
            });
        });
    }

    getAllAccounts(): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        let sql = 'select b.*, exists(select authority.name as role_name from user a ' +
        'inner join user_authority on user_authority.user_id = a.id ' +
        'inner join authority on user_authority.authority_id = authority.id ' +
        'where authority.name = ? and a.id = b.id) as is_admin from user as b ' +
        'where b.deleted = 0';
        const params = ['ROLE_ADMIN'];
        sql = format(sql, params);
        return Promise.using(Database.getSqlConnection(),(connection) => {
            return connection.query(sql).then((rows: any[]) => {
                if (rows.length > 0) {
                    obj.success = 1;
                    _this.opsLogger.debug('Accounts found');
                    obj.data = obj.data.concat(rows);
                } else {
                    _this.opsLogger.debug('No accounts found');
                    obj.data.push('No accounts found.');
                }
                return obj;
            }).catch((error) => {
                _this.errorLogger.error(error);
                obj.success = 0;
                return obj;
            });
        });
    }

    update(firstName: string, lastName: string, email: string): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!firstName || firstName.trim().length === 0) {
            messages.push('You must provide your first name.');
        }

        if (!lastName || lastName.trim().length === 0) {
            messages.push('You must provide your last name.');
        }

        if (!email || email.trim().length === 0) {
            messages.push('You must provide your email address.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = trim(?), ?? = trim(?) where ?? = lower(trim(?))';
            const params = ['user', 'first_name', firstName, 'last_name', lastName, 'email', email];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    _this.opsLogger.debug('Account updated');
                    obj.success = 1;
                    obj.data.push('Account updated.');
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    updateById(firstName: string, lastName: string, admin: boolean, id: number): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!firstName || firstName.trim().length === 0) {
            messages.push('You must provide your first name.');
        }

        if (!lastName || lastName.trim().length === 0) {
            messages.push('You must provide your last name.');
        }

        if (id < 1) {
            messages.push('You must provide a user ID.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = trim(?), ?? = trim(?) where ?? = ?';
            let params = ['user', 'first_name', firstName, 'last_name', lastName, 'id', id];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    _this.opsLogger.debug('Account updated');
                    obj.success = 1;
                    obj.data.push('Account updated.');

                    sql = 'select count(*) as c from ?? where ?? = ?';
                    params = ['user_authority', 'user_id', id];
                    sql = format(sql, params);
                    connection.query(sql).then(rows2 => {
                        if (rows2[0].c === 1 && admin) {
                            sql = 'insert into ?? (??, ??) values (?, ?)';
                            params = ['user_authority', 'user_id', 'authority_id', id, 2];
                            sql = format(sql, params);
                            connection.query(sql);
                        } else if (rows2[0].c === 2 && !admin) {
                            sql = 'delete from ?? where ?? = ?';
                            params = ['user_authority', 'user_id', id];
                            sql = format(sql, params);
                            connection.query(sql);
                        }
                    });

                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    updatePassword(password: string, passwordConfirm: string, email: string): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!password || password.trim().length === 0) {
            messages.push('You must provide your new password.');
        }

        if (!passwordConfirm || passwordConfirm.trim().length === 0) {
            messages.push('You must provide confirmation of your new password.');
        }

        if (password !== passwordConfirm) {
            messages.push('Password and password confirmation must match.');
        }

        if (!email || email.trim().length === 0) {
            messages.push('You must provide your email address.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = sha2(?, 512) where ?? = lower(trim(?))';
            const params = ['user', 'password_hash', password, 'email', email];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    _this.opsLogger.debug('Password updated');
                    obj.success = 1;
                    obj.data.push('Password updated.');
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    requestPasswordReset(email: string): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!email || email.trim().length === 0) {
            messages.push('You must provide your email address.');
        }

        if (messages.length > 0) {
            obj.success = 0;
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            const newPass = Login.makeRandomString(8);
            const resetKey = Login.makeRandomString(20);
            let sql = 'update ?? set ?? = sha2(?, 512), ?? = ?, ?? = current_timestamp where ?? = lower(trim(?)) and ?? = ?';
            const params = ['user', 'password_hash', newPass, 'reset_key', resetKey, 'reset_date', 'email', email, 'deleted', 0];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    if (rows.affectedRows > 0) {
                        const resetUrl = process.env.BASE_WEB_CLIENT_URL + 'password-reset-finish/'  + resetKey;
                        const text = 'You have requested a password reset.  If you did not make this request, please contact ' +
                            process.env.CONTACT_EMAIL + '.  To reset your password, please visit ' + resetUrl + ' to create a new one.';
                        const html = '<p>You have requested a password reset.  If you did not make this request, please contact '
                            + '<a href="mailto:' + process.env.CONTACT_EMAIL + '">' + process.env.CONTACT_EMAIL + '</a>. ' +
                            'To reset your password, please visit ' + resetUrl + ' to create a new one.';
                        Email.sendEmail(process.env.CONTACT_EMAIL, [email], [], 'DonaldMcDougal.com password reset request',
                            text, html).then(() => {
                            _this.opsLogger.debug('Password reset requested');
                            obj.success = 1;
                            obj.data.push('Password reset requested.');
                            return obj;
                        }).then(msg => {
                            if (msg.success === 0) {
                                _this.errorLogger.error(msg.data[0]);
                            }
                        }).catch((error) => {
                            console.log(error);
                        });
                        _this.opsLogger.debug('Password reset requested');
                        obj.success = 1;
                        obj.data.push('Password reset requested.');
                        return obj;
                    } else {
                        _this.opsLogger.debug('Password reset failed because an account does not exist with the provided email or has been deleted.');
                        obj.success = 0;
                        obj.data.push('Password reset failed because an account does not exist with the provided email or has been deleted.');
                        return obj;
                    }
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    updatePasswordUsingResetKey(password: string, passwordConfirm: string, resetKey: string): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!password || password.trim().length === 0) {
            messages.push('You must provide your new password.');
        }

        if (!passwordConfirm || passwordConfirm.trim().length === 0) {
            messages.push('You must provide confirmation of your new password.');
        }

        if (password !== passwordConfirm) {
            messages.push('Password and password confirmation must match.');
        }

        if (!resetKey || resetKey.trim().length === 0) {
            messages.push('You must provide your reset key.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = sha2(?, 512), ?? = null, ?? = current_timestamp where ?? = ?';
            const params = ['user', 'password_hash', password, 'reset_key', 'reset_date', 'reset_key', resetKey];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    if (rows.affectedRows > 0) {
                        _this.opsLogger.debug('Password reset');
                        obj.success = 1;
                        obj.data.push('Password reset.');
                    } else {
                        _this.opsLogger.warn('Password not reset.  Reset key not found');
                        obj.success = 0;
                        obj.data.push('Password not reset.  Reset key not found.');
                    }
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    activateAccount(activationKey: string): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (!activationKey || activationKey.trim().length === 0) {
            messages.push('You must provide your activation key.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = null, ?? = ? where ?? = ?';
            const params = ['user', 'activation_key', 'activated', 1, 'activation_key', activationKey];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    if (rows.affectedRows > 0) {
                        _this.opsLogger.debug('Account activated');
                        obj.success = 1;
                        obj.data.push('Account activated.  You may not sign in.');
                    } else {
                        _this.opsLogger.debug('Account not activated.  Activation key not found');
                        obj.success = 0;
                        obj.data.push('Account not activated.  Activation key not found.');
                    }
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    remove(id: number): Promise<ResponseMessage> {
        const _this = this;
        const obj = new ResponseMessage();
        const messages: string[] = [];

        if (id < 1) {
            messages.push('You must provide your email address.');
        }

        if (messages.length > 0) {
            obj.data = messages;
            return new Promise((resolve, reject) => {
                resolve(obj);
            });
        } else {
            let sql = 'update ?? set ?? = ? where ?? = ?';
            const params = ['user', 'deleted', 1, 'id', id];
            sql = format(sql, params);
            return Promise.using(Database.getSqlConnection(),(connection) => {
                return connection.query(sql).then((rows: any) => {
                    _this.opsLogger.debug('User deleted');
                    obj.success = 1;
                    obj.data.push('User deleted.');
                    return obj;
                }).catch((error) => {
                    _this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        }
    }

    private static makeRandomString(length: number): string {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const textArr: string[] = [];

        for (let i = 0; i < length; i++) {
            textArr.push(possible.charAt(Math.floor(Math.random() * possible.length)));
        }
        return textArr.join('');
    }
}
