import { readFileSync } from 'fs';
import { join } from 'path';

export class EnvVariables {

  private static DIST_FOLDER = join(process.cwd(), 'dist');

    static init() {

        process.env.JWT_SECRET = readFileSync(join(EnvVariables.DIST_FOLDER, process.env.JWT_SECRET_PATH), 'utf8');
        process.env.JWT_EXPIRES_IN = readFileSync(join(EnvVariables.DIST_FOLDER, process.env.JWT_EXPIRES_IN_PATH), 'utf8');
        process.env.SERVER_KEY = readFileSync(process.env.SERVER_KEY_PATH === 'server.key' ?  join(EnvVariables.DIST_FOLDER, process.env.SERVER_KEY_PATH) : process.env.SERVER_KEY_PATH, 'utf8');
        process.env.SERVER_CERT = readFileSync(process.env.SERVER_CERT_PATH === 'server.crt' ?  join(EnvVariables.DIST_FOLDER, process.env.SERVER_CERT_PATH) : process.env.SERVER_CERT_PATH, 'utf8');
        if (process.env.SERVER_CERT_CA_PATH === 'null' || !process.env.SERVER_CERT_CA_PATH) {
            process.env.SERVER_CA = null;
        } else {
            process.env.SERVER_CA = readFileSync(process.env.SERVER_CERT_CA_PATH, 'utf8');
        }
    }
}
