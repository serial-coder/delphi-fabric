CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)
projectRoot=$(dirname $CURRENT)
export SOFTHSM2_CONF=$projectRoot/config/softhsm2.conf
mkdir -p /tmp/softHSM2/ ## align with softhsm2.conf
label="fabric"
$projectRoot/common/bash/softHSM.sh initToken $label
node $projectRoot/common/nodejs/test/hsmTest.js
