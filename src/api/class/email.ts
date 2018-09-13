import { SendMailOptions, SentMessageInfo } from 'nodemailer';
import { getLogger, Logger } from 'log4js';
import mailer from '../common/email-connect';
import { ResponseMessage } from '../../common/response-message';

export class Email {

    private static errorLogger: Logger = getLogger('default');
    private static opsLogger: Logger = getLogger('ops');

    static sendEmail(from: string, toList: string[], ccList: string[], subject: string, text: string, html: string): Promise<ResponseMessage> {

        const opts: SendMailOptions = {
            from: from,
            sender: from,
            replyTo: from,
            to: toList, // array of receivers
            cc: ccList, // array of ccs
            subject: subject, // Subject line
            text: text, // plain text body
            html: html // html body
        };

        return new Promise<ResponseMessage>((resolve, reject) => {
            mailer.sendMail(opts, (error: Error, info: SentMessageInfo) => {
                const obj = new ResponseMessage();
                if (error) {
                    Email.errorLogger.error('Failed to send email');
                    obj.success = 0;
                    obj.data.push('Error sending email: "' + error.message + '"');
                    resolve(obj);
                } else {
                    Email.opsLogger.debug('Email sent');
                    obj.success = 1;
                    obj.data.push('Email sent.');
                    resolve(obj);
                }
            });
        });
    }

}
