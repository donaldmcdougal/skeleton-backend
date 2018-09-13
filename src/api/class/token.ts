import * as jwt from 'jsonwebtoken';
const Promise = require('bluebird');
import * as core from 'express-serve-static-core';
import * as mysql from 'mysql';
import { Database } from '../common/db-pool';
import { ResponseMessage } from '../../common/response-message';
import { getLogger, Logger } from "log4js";

export class Token {

    private static errorLogger: Logger = getLogger('default');
    private static opsLogger: Logger = getLogger('ops');

    static verifyToken(req: core.Request): Promise<ResponseMessage> {
        // verify a token with a callback function called on the decoded result.
        const obj = new ResponseMessage();

        const authHeadersSplit = req.headers.authorization.split(' ');
        if (authHeadersSplit[0] !== 'Bearer' || authHeadersSplit.length !== 2) {
            return new Promise((resolve, reject) => {
                this.opsLogger.info('Token not provided');
                obj.data.push('Token not provided');
                resolve(obj);
            });
        }
        try {
            const token = authHeadersSplit[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
            obj.success = 1;
            obj.data.push(decoded);
            return new Promise((resolve, reject) => {
                this.opsLogger.debug('Token verified');
                resolve(obj);
            });
        } catch (err) {
            return new Promise((resolve, reject) => {
                obj.success = 0;
                if (err.name === 'TokenExpiredError') {
                    obj.data.push('Token Expired');
                } else {
                    obj.data.push('Token Error: ' + err.message);
                }
                this.opsLogger.warn(obj.data[0]);
                resolve(obj);
            });
        }
    }

    static verifyAdminToken(req: core.Request): Promise<ResponseMessage> {
        const obj = new ResponseMessage();
        // verify a token with a callback function called on the decoded result.
        const authHeadersSplit = req.headers.authorization.split(' ');
        if (authHeadersSplit[0] !== 'Bearer' || authHeadersSplit.length !== 2) {
            return new Promise((resolve, reject) => {
                this.opsLogger.info('Token not provided');
                obj.data.push('Token not provided');
                resolve(obj);
            });
        }

        try {
            const token = authHeadersSplit[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
            let sql = `select u.* from user as u
                inner join user_authority as ua on u.id = ua.user_id
                inner join authority as a on a.id = ua.authority_id
                where a.name = 'ROLE_ADMIN'
                and u.deleted = 0
                and u.email = lower(trim(?))`;
            const params: any[] = [decoded.email];
            sql = mysql.format(sql, params);

            return Promise.using(Database.getSqlConnection(),(connection) => {
                const obj = new ResponseMessage();
                return connection.query(sql).then((rows: any) => {
                    this.opsLogger.debug('Admin token verified');
                    obj.success = 1;
                    obj.data.push(decoded);
                    return obj;
                }).catch((error) => {
                    this.errorLogger.error(error);
                    obj.success = 0;
                    obj.data.push(error);
                    return obj;
                });
            });
        } catch (err) {
            return new Promise((resolve, reject) => {
                const obj = new ResponseMessage();
                obj.success = 0;
                if (err.name === 'TokenExpiredError') {
                    obj.data.push('Token Expired');
                } else {
                    obj.data.push('Token Error: ' + err.message);
                }
                this.opsLogger.warn(obj.data[0]);
                return resolve(obj);
            });
        }
    }

    static getToken(email: string): string {
        try {
            return jwt.sign({timestamp: Date.now(), email: email}, process.env.JWT_SECRET,
                {algorithm: 'HS512', expiresIn: process.env.JWT_EXPIRES_IN});
        } catch (err) {
            this.errorLogger.error(err.message);
            return null;
        }
    }
}
