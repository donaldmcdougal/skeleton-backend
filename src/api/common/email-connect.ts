import * as nodemailer from 'nodemailer';

// create reusable transporter object using the default SMTP transport
export default nodemailer.createTransport({
  service: process.env.EMAIL_TRANSPORT_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});
