# README #

This README documents the steps necessary to get the server up and running.

### What is this repository for? ###

* Provides a skeleton for a NodeJS application with authentication using JWT as well as admin capabilities.
* 1.0.0

### How do I get set up? ###

* Clone the repo.
* Install MySQL server, Node.JS, and npm for your platform.
* Create the database using the create.sql script in the 'db' folder at the project's root.
* Add a `.env` file at the project's root.  An example can be found in the `dotenv-example` file at the project's root.  The `dotenv-example` file contains all the environment variables you will need.
* `npm install`
* `npm start`

### Who do I talk to? ###

* [John Schneider](mailto:jmschneider000@gmail.com)

### Notes ###

This project would not be possible without the [Jhipster](https://www.jhipster.tech/) project.

### Important! ###

You really, *really* need to change the value in `key.jwt` before deploying to production.