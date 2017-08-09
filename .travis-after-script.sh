#!/bin/bash
source node_modules/park-sh/lib/git.sh
source node_modules/park-sh/lib/travis.sh
set -ev

# Deploy the Serverless stack to the corresponding environment.
# It assumes that the branches are "dev", "stage", "acc" and "prod". To override
# the branch names use "export DEPLOYABLE_BRANCHES=(br1 br2 br3 br4)".
# This is commented out below because park-sh is not a Serverless app.
source node_modules/park-sh/lib/serverless.sh

# If you add a string to the doDeploy function those values will be passed to
# the serverless deploy command as additional arguments.
doDeploy
