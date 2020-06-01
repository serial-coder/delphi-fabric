const logger = require('khala-logger/log4js').consoleLogger('test:fabric-network');
const helper = require('../../app/helper');
const org1 = 'astri.org';
const org2 = 'icdd';

const orderer = helper.newOrderers()[0];
const channelName = 'allchannel';

const Gateway = require('../../common/nodejs/fabric-network/gateway');
const user = helper.getOrgAdmin();
const gateway = new Gateway(user);
const ContractManager = require('../../common/nodejs/fabric-network/contract');

const putRaw = async (contractManager) => {
	const result = contractManager.submitTransaction('putRaw', undefined, 'key', 'value');
	logger.info(result);
};

const getContractManager = (network, chaincodeId) => {
	const contract = network.getContract(chaincodeId);
	return new ContractManager(contract);
};
describe('diagnose', async () => {
	const chaincodeId = 'diagnose';

	const peers = [helper.newPeer(0, org1), helper.newPeer(0, org2)];

	for (const peer of peers) {
		await peer.connect();
	}
	await orderer.connect();

	const network = await gateway.connect(channelName, peers, orderer); // FIXME webstorm: No tests were found
	const contractManager = getContractManager(network, chaincodeId);
	it('putRaw', async () => {
		await putRaw(contractManager);
	});
	it('getRaw', async () => {
		const result = contractManager.evaluateTransaction('getRaw');
		logger.info(result);
	});
	it('panic', async () => {
		await contractManager.evaluateTransaction('panic');
	});
});
describe('diagnose:eventHub', async () => {
	const chaincodeId = 'diagnose';
	const peers = [helper.newPeer(0, org1), helper.newPeer(0, org2)];
	for (const peer of peers) {
		await peer.connect();
	}
	await orderer.connect();
	const network = await gateway.connect(channelName, peers, orderer, undefined, true);
	const contractManager = getContractManager(network, chaincodeId);
	it('putRaw', async () => {
		await putRaw(contractManager);
	});
});
describe('diagnose:discovery:eventHub', async () => {
	const discoveryOrg = org1; //TODO
	const globalConfig = require('../../config/orgs.json');
	const {mspid: mspId} = globalConfig.organizations[discoveryOrg];
	const networkConfig = globalConfig;
	const chaincodeId = 'diagnose';
	it('getRaw', async () => {
		const getPeersByOrgNameCallback = (orgName) => {
			return helper.newPeers(undefined, orgName);
		};
		const discoveryOptions = {mspId, networkConfig, getPeersByOrgNameCallback};
		const network = await gateway.connect(channelName, undefined, orderer, discoveryOptions, true);
		const contractManager = getContractManager(network, chaincodeId);
		const result = await contractManager.evaluateTransaction('getRaw', 'key');
		logger.info(result);
	});
});
describe('nodeContracts:eventHub', async () => {
	const chaincodeId = 'nodeContracts';
	const peers = [helper.newPeer(0, org1), helper.newPeer(0, org2)];

	const network = await gateway.connect(channelName, peers, orderer, undefined, true);
	const contractManager = getContractManager(network, chaincodeId);

	it('stress:init', async () => {
		await contractManager.submitTransaction('stress:init');
	});
	it('stress:panic', async () => {
		await contractManager.submitTransaction('stress:panic');
	});
	it('unknown fcn ', async () => {
		await contractManager.submitTransaction('any');
	});
	it('shimError', async () => {
		await contractManager.submitTransaction('shimError');
	});
});
