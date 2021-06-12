// https://github.com/spotboard/domjudge-converter/blob/master/config.js

module.exports = {
    cms: {
        /**
         * Contest Management System Scoreboard base URL
         * Do not add '/' at the end of line!
         */
        scoreboard: 'https://ranking.ioi2020.sg'
    },

    /**
     * Destination path which files will be created
     *
     * e.g. '.'
     * e.g. '/var/www/html/spotboard'
     */
    dest: '.',

    /**
     * Force unfreezing scoreboard client side.
     * This might be useful when collecting final runs.json privately.
     */
    unfreeze: false,

    /**
     * Freezing time in minutes
     */
    freezeTime: 180,

    /**
     * Running interval in milliseconds.
     * null for running only once.
     *
     * e.g. null
     * e.g. 3000
     */
    interval: 3000,

    axios: {
        /**
         * API request timeout
         */
        timeout: 3000,
    },
};