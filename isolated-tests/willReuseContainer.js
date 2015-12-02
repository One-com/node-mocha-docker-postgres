var expect = require('unexpected');
require('../');
var Docker = require('dockerode');

function pickIdAndImage(obj) { return obj.Id + ':' + obj.Image; }

describe('will reuse the same instance across multiple calls', function () {
    var docker = null;
    var beforeStartContainerList = null;
    var afterStartContainerList = null;
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
    describe('2. the first round of tests', function () {
        before(function () {
            return this.dockerPostgres();
        });
        it('should have one more running instance', function () {
            var that = this;
            return expect(function (cb) {
                docker.listContainers({all: true}, cb);
            }, 'to call the callback without error').spread(function (containerList) {
                afterStartContainerList = containerList.map(pickIdAndImage);
                return expect(afterStartContainerList, 'to have length', beforeStartContainerList.length + 1);
            }).then(function () {
                return expect(that, 'to satisfy', {
                    conString: /^postgres:/
                });
            });
        });
    });
    describe('3. the second round of tests', function () {
        beforeEach(function () {
            return this.dockerPostgres();
        });
        it('should still only have one more running instance', function () {
            var that = this;
            return expect(function (cb) {
                docker.listContainers({all: true}, cb);
            }, 'to call the callback without error').spread(function (containerList) {
                return expect(containerList.map(pickIdAndImage), 'to equal', afterStartContainerList);
            }).then(function () {
                return expect(that, 'to satisfy', {
                    conString: /^postgres:/
                });
            });
        });
        it('should still only have one more running instance', function () {
            var that = this;
            return expect(function (cb) {
                docker.listContainers({all: true}, cb);
            }, 'to call the callback without error').spread(function (containerList) {
                return expect(containerList.map(pickIdAndImage), 'to equal', afterStartContainerList);
            }).then(function () {
                return expect(that, 'to satisfy', {
                    conString: /^postgres:/
                });
            });
        });
    });
});
