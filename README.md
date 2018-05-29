# mocha docker postgres

[![Build Status](https://travis-ci.org/One-com/node-mocha-docker-postgres.svg?branch=master)](https://travis-ci.org/One-com/node-mocha-docker-postgres)

mocha testhelper for integration tests with postgres using docker.

## Usage:

Ensure Docker is installed and the postgres docker image has been pulled. e.g. ```docker pull postgres```

```js
require('mocha-docker-postgres'); // will patch the mocha Context prototype

var someModule = require('../someModule');

describe('some module', function () {
    var instanceOfSomeModule;
    before(function () {
        this.timeout(10000); // you may need to bump the timeout for this block
        return this.dockerPostgres();
    });
    before(function () {
        // create an instance of someModule where the connection string
        // to the created postgres instance is passed along as an option
        instanceOfSomeModule = someModule({
            conString: this.conString
        });
    });

    it('should ...', function () {
        return expect(instanceOfSomeModule.whatEver, 'to ...');
    });
});
```

A call to `this.dockerPostgres()` will start a docker container (unless we already
have one that fits) , and will set the value this.conString to the postgres url
needed to connect to that database.

The method returns a promise, and that promise will not resolve until the postgres
database is ready to accept connections.

You get a completely fresh database after each call to `this.dockerPostgres` so
you will need to run your migrations in a before hook after that.

If you want to have a completely fresh database for each test, you can make the
`before` hook into a `beforeEach`. It will reuse the same postgres container,
but create new databases for each invocation of the method - which makes it a lot
less time consuming.

On my developer work station it takes about 4 seconds for postgres to start up,
and that is only done once per test run.

## Running on OSX

On all platforms elevated privileges are required to bind to TCP ports < 1024 and
to run the docker deamon. On OSX ```brew install docker``` just installs the CLI
In order to get docker running use ```brew cask install docker```. Then open the
Docker application and allow privileged execution when prompted.
