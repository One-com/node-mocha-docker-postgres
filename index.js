var Promise = require('when').Promise;
var passError = require('passerror');
var PostgresContainer = require('./lib/PostgresContainer');

var state = {
    containerReference: null,
    databaseNames: {}
};

function startContainer(dockerOpts, done) {
    var callbackCalled = false;
    var container = new PostgresContainer(dockerOpts);

    container
        .once('ready', function () { if (!callbackCalled) { return done(); } })
        .once('error', function (err) { done(err); });

    state.containerReference = container;
}

function waitForDockerContainerToBeReady(dockerOpts, done) {
    var containerReference = state.containerReference;
    if (containerReference) {
        if (containerReference.ready) {
            setImmediate(done);
        } else {
            containerReference
                .once('ready', function () {  done(); })
                .once('error', function (err) { done(err); });
        }
    } else {
        startContainer(dockerOpts, done);
    }
}

function getDatabaseNameFromTest(input) {
    var fragments = [];
    for (var t = input; t ; t = t.parent || t._runnable ) {
        if (t.currentTest && t.currentTest.title) {
            fragments.push(t.currentTest.title);
        } else if (t.title) {
            fragments.push(t.title);
        }
    }

    var databaseName = fragments.map(function (str) {
        var matches = str.match(/^"(before|after) (all|each)" hook$/);
        if (matches) {
            return matches[1] + matches[2];
        }
        return str;
    }).reverse().join(' ');
    databaseName = databaseName.replace(/[^\w]/g, '_');
    databaseName = databaseName.substr(-60);
    databaseName = databaseName.toLowerCase();
    if (!/^[a-z_]/.test(databaseName)) {
        databaseName = '_' + databaseName;
    }

    var nextSuffixToTry = 0;

    while (state.databaseNames.hasOwnProperty(nextSuffixToTry ? databaseName + '_' + nextSuffixToTry : databaseName)) {
        nextSuffixToTry += 1;
    }

    if (nextSuffixToTry) {
        databaseName += '_' + nextSuffixToTry;
    }

    state.databaseNames[databaseName] = true;
    return databaseName;
}

function dockerPostgres(dockerOpts) {
    var that = this;
    var databaseName = getDatabaseNameFromTest(this);

    // set the timeout of the hook long enough for the container to start
    this.timeout(10000);
    return new Promise(function (resolve, reject) {
        if (
            process.env.POSTGRES_USER ||
            process.env.POSTGRES_PASSWORD ||
            process.env.POSTGRES_PORT
        ) {
            var pgUser = process.env.POSTGRES_USER;
            var pgPassword = process.env.POSTGRES_PASSWORD;
            var pgPort = process.env.POSTGRES_PORT;

            var ip = pgPort.split(':')[1].substr(2);
            var port = pgPort.split(':')[2];

            PostgresContainer.prototype.getConString.call({
                conString: 'postgres://' + pgUser + ':' + pgPassword + '@' + ip + ':' + port + '/{database}',
                pgUser: pgUser
            }, databaseName, passError(reject, function (conString) {
                that.conString = conString;
                resolve();
            }));
        } else {
            waitForDockerContainerToBeReady(dockerOpts, passError(reject, function () {
                state.containerReference.getConString(databaseName, passError(reject, function (conString) {
                    that.conString = conString;
                    resolve();
                }));
            }));
        }
    });
}


// Try to find the global mocha and it's Context
var Context;
var currentModule = typeof module !== 'undefined' && module;
while (currentModule) {
    if ((currentModule.exports && currentModule.exports.name === 'Mocha') || (/(\/mocha\.js|_mocha)$/).test(currentModule.filename)) {
        Context = currentModule.exports.Context;
        break;
    } else {
        currentModule = currentModule.parent;
    }
}

if (!Context) {
    throw new Error('DockerMochaPostgres needs to be run in mocha.');
}

Context.prototype.dockerPostgres = dockerPostgres;

// This ugly hack is needed because mocha explicitly calls process.exit, and
// that node will not trigger the beforeExit event when process.exit is called.
var realProcessExit = process.exit;
process.exit = function (exitCode) {
    process.exit = realProcessExit;
    if (state.containerReference) {
        state.containerReference.shutdown(function (err) {
            if (err) {
                throw err;
            }
            process.exit(exitCode);
        });
    } else {
        process.exit(exitCode);
    }
};
