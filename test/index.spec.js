var expect = require('unexpected');
var proxyquire = require('proxyquire');

describe('dockerPostgres', function () {
    proxyquire('../index', {
        './PostgresContainer': proxyquire('../lib/PostgresContainer', {
            './executeSql': function(conString, query, cb) { return cb(); }
        })
    });

    describe('when running on Gitlab CI server', function () {
        before(function () {
            process.env.GITLAB_CI = 'true';
            process.env.POSTGRES_USER = 'foo';
            process.env.POSTGRES_PASSWORD = 'bar';
            process.env.POSTGRES_PORT_5432_TCP_PORT = 5432;
            process.env.POSTGRES_PORT_5432_TCP_ADDR = '0.0.0.0';
        });

        after(function () {
            delete process.env.GITLAB_CI;
            delete process.env.POSTGRES_USER;
            delete process.env.POSTGRES_PASSOWRD;
            delete process.env.POSTGRES_PORT_5432_TCP_PORT;
            delete process.env.POSTGRES_PORT_5432_TCP_ADDR;
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
