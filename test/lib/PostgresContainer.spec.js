var expect = require('unexpected');
var PostgresContainer = require('../../lib/PostgresContainer');

describe('PostgresContainer', function () {
    it('should start a postgres container, emit ready when ready, and shutdown', function () {
        this.timeout(10000);
        return expect(function (cb) {
            var hadError = null;
            var postgresContainer = new PostgresContainer();

            postgresContainer.on('error', function (err) {
                hadError = err;
            });

            postgresContainer.once('end', function () {
                return cb(hadError);
            });

            postgresContainer.once('ready', function () {
                postgresContainer.shutdown();
            });
        }, 'to call the callback without error');
    });

    it('should be able to get a database', function () {
        this.timeout(10000);
        return expect(function (cb) {
            var hadError = null;
            var hadConString = false;
            var postgresContainer = new PostgresContainer();

            postgresContainer.on('error', function (err) {
                hadError = err;
            });

            postgresContainer.once('end', function () {
                return cb(hadError, hadConString);
            });

            postgresContainer.once('ready', function () {
                postgresContainer.getConString('adatabase', function (err, conString) {
                    hadError = err;
                    hadConString = conString;
                    postgresContainer.shutdown();
                });
            });
        }, 'to call the callback without error').spread(function (conString) {
            return expect(conString, 'to match', /^postgres:\/\/\w+:\w+@(\d+\.){3}\d+:\d+\/\w+$/);
        });
    });

    it('should hand out different databases', function () {
        this.timeout(10000);
        return expect(function (cb) {
            var hadError = null;
            var conStrings = [];
            var postgresContainer = new PostgresContainer();

            postgresContainer.on('error', function (err) {
                hadError = err;
            });

            postgresContainer.once('end', function () {
                return cb(hadError, conStrings);
            });

            postgresContainer.once('ready', function () {
                postgresContainer.getConString('anotherdatabase', function (err, conString) {
                    if (err) {
                        hadError = err;
                        return postgresContainer.shutdown();
                    }
                    conStrings.push(conString);
                    postgresContainer.getConString('yetanotherdatabase', function (err, conString) {
                        if (err) {
                            hadError = err;
                        } else {
                            conStrings.push(conString);
                        }
                        return postgresContainer.shutdown();
                    });
                });
            });
        }, 'to call the callback without error').spread(function (conStrings) {
            return expect(conStrings, 'to have items satisfying', 'to match', /^postgres:\/\/\w+:\w+@(\d+\.){3}\d+:\d+\/\w+$/);
        });
    });
});
