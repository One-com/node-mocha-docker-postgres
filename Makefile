.PHONY: test
test:
	./node_modules/.bin/mocha
	bash test/willCleanUpAfterRunningTests.sh
	bash test/willReuseTheSameContainerAcrossTests.sh
