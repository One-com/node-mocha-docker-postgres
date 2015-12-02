#!/usr/bin/env bash

SCRIPT_PATH="`dirname \"$0\"`"
cd $SCRIPT_PATH

MOCHA_BIN=../node_modules/.bin/mocha

echo "Testing mocha-docker-postgres"
echo "-----------------------------"
echo ""
echo "It will reuse the same container across tests."
echo ""

NUMBER_OF_RUNNING_CONTAINERS_BEFORE=`bc -l <<< "$(docker ps -a | wc -l) - 1"`

echo "Before running tests:"
echo "  $NUMBER_OF_RUNNING_CONTAINERS_BEFORE running docker containers"

$MOCHA_BIN ../isolated-tests/willReuseContainer.js

NUMBER_OF_RUNNING_CONTAINERS_AFTER=`bc -l <<< "$(docker ps -a | wc -l) - 1"`

echo ""
echo "After running tests:"
echo "  $NUMBER_OF_RUNNING_CONTAINERS_AFTER running docker containers"

echo ""

if [[ $NUMBER_OF_RUNNING_CONTAINERS_AFTER -eq $NUMBER_OF_RUNNING_CONTAINERS_BEFORE ]] ; then
    echo "Test passed!"
else
    echo "Test failed!"
    exit 1;
fi
