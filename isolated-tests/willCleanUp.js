require('../test/polyfill');
var expect = require('unexpected');
require('../');
var Docker = require('dockerode');

function pickIdAndImage(obj) { return obj.Id + ':' + obj.Image; }

describe('will cleanup after running tests', function () {
    var docker = null;
    var beforeStartContainerList = null;
    before(function () {
        docker = new Docker();
    });
    describe('1. before running the tests', function () {
        it('check the running docker instances', function () {
            return expect(function (cb) {
                docker.listContainers({all: true}, cb);
            }, 'to call the callback without error').spread(function (containerList) {
                beforeStartContainerList = containerList.map(pickIdAndImage);
            });
        });
    });
    describe('2. the tests', function () {
        before(function () {
            return this.dockerPostgres();
        });
        it('should have one more running instance', function () {
            var that = this;
            return expect(function (cb) {
                docker.listContainers({all: true}, cb);
            }, 'to call the callback without error').spread(function (containerList) {
                return expect(containerList.map(pickIdAndImage), 'to have length', beforeStartContainerList.length + 1);
            }).then(function () {
                return expect(that, 'to satisfy', {
                    conString: /^postgres:/
                });
            });
        });
    });
});
