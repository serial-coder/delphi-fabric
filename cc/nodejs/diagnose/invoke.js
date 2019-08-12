const {invoke, query} = require('../../../app/invokeHelper');
const chaincodeId = 'nodeDiagnose';
exports.put = async (peers, clientPeerOrg, key, value) => {
	const fcn = 'put';
	const args = [key, value];
	return invoke(peers, clientPeerOrg, chaincodeId, fcn, args);
};
exports.get = async (peers, clientPeerOrg, key) => {
	const fcn = 'get';
	const args = [key];
	return query(peers, clientPeerOrg, chaincodeId, fcn, args);
};
exports.whoami = async (peers, clientPeerOrg) => {
	const fcn = 'whoami';
	return query(peers, clientPeerOrg, chaincodeId, fcn, []);
};
exports.setEvent = async (peers, clientPeerOrg, {name, event}, eventHubs) => {
	const fcn = 'setEvent';
	const args = [name, event];
	return invoke(peers, clientPeerOrg, chaincodeId, fcn, args, undefined, eventHubs);
};
