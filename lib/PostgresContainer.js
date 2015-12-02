var Docker = require('dockerode');
var passError = require('passerror');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var executeSql = require('./executeSql');

function PostgresContainer (dockerOpts) {
    EventEmitter.call(this);

    this.dockerOpts = dockerOpts || {};

    var dockerConnectionKey = Object.keys(this.dockerOpts).some(function (key) {
        return ['socketPath', 'host'].indexOf(key) !== -1;
    });

    if (!dockerConnectionKey) {
        // Neither socketPath nor host option given in dockerOpts.
        // Default to the docker default configuration.
        this.dockerOpts.socketPath = '/var/run/docker.sock';
    }

    this.containerDidStart = false;
    this.containerDidCreate = false;
    this.ready = false;
    this.conString = null;
    this.container = null;

    this.pgUser = 'foo';
    this.pgPassword = 'bar';

    this.init();
}

util.inherits(PostgresContainer, EventEmitter);

PostgresContainer.prototype.handleError = function (err) {
    this.emit('error', err);
    this.shutdown();
};

PostgresContainer.prototype.shutdown = function (cb)  {
    var that = this;
    var eatNonError = function (fn) { return function (err) { return fn(err); }; };
    async.waterfall([
        function (cb) {
            if (that.containerDidStart) {
                return that.container.stop(eatNonError(cb));
            }
            return cb();
        },
        function (cb) {
            if (that.containerDidCreate) {
                return that.container.remove(eatNonError(cb));
            }
            return cb();
        }
    ], function (err) {
        that.emit('end');
        if (typeof cb === 'function') {
            return cb(err);
        }
    });
};

PostgresContainer.prototype.init = function () {
    var that = this;
    var docker = new Docker(this.dockerOpts);
    var handleError = this.handleError.bind(this);

    docker.createContainer({
        Image: 'postgres',
        Env: [
            'POSTGRES_USER=' + that.pgUser,
            'POSTGRES_PASSWORD=' + that.pgPassword
        ],
        ExposedPorts: {
            '5432/tcp': {}
        },
        HostConfig: {
            PublishAllPorts: true
        }
    }, passError(handleError, function (containerReference) {
        that.containerDidCreate = true;
        that.container = containerReference;
        that.container.start(passError(handleError, function () {
            that.containerDidStart = true;
            that.container.inspect(passError(handleError, function (data) {
                var ip = data.NetworkSettings.Ports['5432/tcp'][0].HostIp;
                if (that.dockerOpts.host) {
                    ip = that.dockerOpts.host;
                }
                var port = data.NetworkSettings.Ports['5432/tcp'][0].HostPort;
                that.conString = 'postgres://' + that.pgUser + ':' + that.pgPassword + '@' + ip + ':' + port + '/{database}';
                that.waitForConnection();
            }));
        }));
    }));
};

PostgresContainer.prototype.retryErrorsMatching = [
    /Connection terminated/,
    /ECONNRESET/,
    /ECONNREFUSED/,
    /the database system is starting up/
];

PostgresContainer.prototype.shouldRetryOnError = function (err) {
    return this.retryErrorsMatching.some(function (pattern) {
        return pattern.test(err.message);
    });
};

PostgresContainer.prototype.waitForConnection = function (startTime) {
    var that = this;
    if (!startTime) {
        startTime = Date.now();
        process.stdout.write('waiting for postgres to be ready.');
    }
    var conString = this.conString.replace('{database}', 'postgres');
    executeSql(conString, 'SELECT now() AS now', function (err) {
        if (err) {
            if (that.shouldRetryOnError(err)) {
                process.stdout.write('.');
                setTimeout(function () {
                    that.waitForConnection(startTime);
                }, 250);
            } else {
                return that.handleError(err);
            }
        } else {
            // It takes a while until the Postgres Database is ready to create
            // databases - even after it can reply to "SELECT now() AS now"
            setTimeout(function () {
                console.log('! (' + (Date.now() - startTime) + 'ms)');
                that.ready = true;
                return that.emit('ready');
            }, 100);
        }
    });
};

PostgresContainer.prototype.getConString = function (databaseName, cb) {
    var that = this;
    var conString = this.conString.replace('{database}', 'postgres');
    executeSql(conString, 'CREATE DATABASE ' + databaseName + ' OWNER ' + that.pgUser, function (err) {
        if (err) {
            cb(err);
            return that.handleError(err);
        }
        return cb(null, that.conString.replace('{database}', databaseName));
    });
};

module.exports = PostgresContainer;
