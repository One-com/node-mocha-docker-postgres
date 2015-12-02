var pg = require('pg');

module.exports = function executeSql(conString, sql, cb) {
    pg.connect(conString, function(err, client, done) {
        if (err) {
            if (client) done(client);
            return cb(err);
        }
        client.query(sql, function(err, result) {
            if (err) {
                done(client);
                return cb(err);
            }
            done();
            return cb(null, result);
        });
    });
};
