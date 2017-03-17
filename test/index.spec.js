var expect = require('unexpected');
var proxyquire = require('proxyquire');

describe('dockerPostgres', function () {
    proxyquire('../index', {
        './PostgresContainer': proxyquire('../lib/PostgresContainer', {
            './executeSql': function(conString, query, cb) { return cb(); }
        })
    });

    describe('when running on a CI server with a liked Postgres container', function () {
        var originalValues = {};

        before(function () {
            originalValues.CI = process.env.CI;
            originalValues.POSTGRES_USER = process.env.POSTGRES_USER;
            originalValues.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
            originalValues.POSTGRES_PORT = process.env.POSTGRES_PORT;

            process.env.CI = true;
            process.env.POSTGRES_USER = 'foo';
            process.env.POSTGRES_PASSWORD = 'bar';
            process.env.POSTGRES_PORT = 'tcp://0.0.0.0:5432';
        });

        after(function () {
            originalValues.CI = process.env.CI;
            process.env.POSTGRES_USER = originalValues.POSTGRES_USER;
            process.env.POSTGRES_PASSWORD = originalValues.POSTGRES_PASSWORD;
            process.env.POSTGRES_PORT = originalValues.POSTGRES_PORT;
        });

        it('should set the connection string for the env connection', function () {
            var that = this;
            return this.dockerPostgres({})
                .then(function () {
                    return expect(
                        that.conString,
                        'to contain',
                         'postgres://foo:bar@0.0.0.0:5432/'
                    );
                })
        });

    });
});
