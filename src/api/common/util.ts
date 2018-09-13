export class Util {

    static verifyEmailFormat(email: string): boolean {
        const emailFormat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return email.match(emailFormat) !== null;
    }

    /**
     * A function used for splitting trimming things in a new array when calling map() on an array.
     * @param {string} str The string to trim.
     * @returns {string} The trimmed string.
     */
    static trim(str: string): string {
        return str.trim();
    }
}