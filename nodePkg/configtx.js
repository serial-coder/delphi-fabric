const yaml = require('khala-nodeutils/yaml');
const {CryptoPath} = require('khala-fabric-sdk-node/path');
const implicitPolicies = require('khala-fabric-sdk-node/policy').configtxPolicies.implicit.Policies;
const {OrdererType} = require('khala-fabric-formatter/constants');
const {homeResolve} = require('khala-light-util');

class Configtx {
	constructor(globalConfig, configtxFile) {
		this.globalConfig = globalConfig;
		this.consortiumName = 'SampleConsortium';
		this.configtxFile = configtxFile;
		this.CRYPTO_CONFIG_DIR = homeResolve(globalConfig.docker.volumes.MSPROOT);
	}

	gen(PROFILE_BLOCK) {
		const channelsConfig = this.globalConfig.channels;
		const ordererConfig = this.globalConfig.orderer;

		const OrganizationBuilder = (orgName, orgConfig, nodeType = 'peer', OrdererEndpoints) => {
			const cryptoPath = new CryptoPath(this.CRYPTO_CONFIG_DIR, {
				[nodeType]: {
					org: orgName
				}
			});
			const result = {
				Name: orgName,
				ID: orgConfig.mspid,
				MSPDir: cryptoPath[`${nodeType}OrgMSP`](),
				Policies: {
					Readers: {
						Type: 'Signature',
						Rule: `OR('${orgConfig.mspid}.member')`
					},
					Writers: {
						Type: 'Signature',
						Rule: `OR('${orgConfig.mspid}.member')`
					},
					Admins: {
						Type: 'Signature',
						Rule: `OR('${orgConfig.mspid}.admin')`
					}
				}
			};
			if (Array.isArray(OrdererEndpoints)) {
				result.OrdererEndpoints = OrdererEndpoints;
			}
			return result;
		};

		const blockProfileConfig = {
			Capabilities: {
				V1_4_3: true
			},
			Policies: implicitPolicies
		};
		const OrdererConfig = {
			BatchTimeout: '1s',
			Addresses: {}, // empty to overwrite default ['127.0.0.1:7050']
			BatchSize: {
				MaxMessageCount: 1,
				AbsoluteMaxBytes: '99 MB',
				PreferredMaxBytes: '512 KB'
			},
			Capabilities: {
				V1_4_2: true
			},
			Policies: {
				Readers: {
					Type: 'ImplicitMeta',
					Rule: 'ANY Readers'
				},
				Writers: {
					Type: 'ImplicitMeta',
					Rule: 'ANY Writers'
				},
				Admins: {
					Type: 'ImplicitMeta',
					Rule: 'MAJORITY Admins'
				},
				BlockValidation: {
					Type: 'ImplicitMeta',
					Rule: 'ANY Writers'
				}
			}
		};
		OrdererConfig.OrdererType = ordererConfig.type;
		if (ordererConfig.type === OrdererType.kafka) {

			const Organizations = [];
			for (const [ordererOrgName, ordererOrgConfig] of Object.entries(ordererConfig.organizations)) {
				const OrdererEndpoints = Object.keys(ordererOrgConfig.orderers).map(ordererName => `${ordererName}.${ordererOrgName}:7050`);
				Organizations.push(OrganizationBuilder(ordererOrgName, ordererOrgConfig, 'orderer', OrdererEndpoints));
			}

			OrdererConfig.Kafka = {
				Brokers: Object.keys(ordererConfig.kafka.kafkas).map((kafka) => `${kafka}:9092`)
			};
			OrdererConfig.Organizations = Organizations;
		} else if (ordererConfig.type === OrdererType.etcdraft) {

			const Organizations = [];
			const Consenters = [];
			for (const [ordererOrgName, ordererOrgConfig] of Object.entries(ordererConfig.organizations)) {
				const OrdererEndpoints = [];
				for (const ordererName in ordererOrgConfig.orderers) {
					const ordererCryptoPath = new CryptoPath(this.CRYPTO_CONFIG_DIR, {
						orderer: {
							org: ordererOrgName, name: ordererName
						}
					});

					const {cert} = ordererCryptoPath.TLSFile('orderer');
					const Host = `${ordererName}.${ordererOrgName}`;
					OrdererEndpoints.push(`${Host}:7050`);
					const consenter = {Host, Port: 7050, ClientTLSCert: cert, ServerTLSCert: cert}; // only accept TLS cert
					Consenters.push(consenter);
				}
				Organizations.push(OrganizationBuilder(ordererOrgName, ordererOrgConfig, 'orderer', OrdererEndpoints));
			}

			OrdererConfig.EtcdRaft = {
				Consenters
			};
			OrdererConfig.Organizations = Organizations;
		}
		blockProfileConfig.Orderer = OrdererConfig;
		const orgsConfig = this.globalConfig.organizations;


		blockProfileConfig.Consortiums = {
			[this.consortiumName]: {
				Organizations: Object.entries(orgsConfig).map(([orgName, orgConfig]) => OrganizationBuilder(orgName, orgConfig, 'peer')
				)
			}
		};

		const Profiles = {
			[PROFILE_BLOCK]: blockProfileConfig
		};
		// Write channel profiles
		for (const channelName in channelsConfig) {
			const channelConfig = channelsConfig[channelName];
			const PROFILE_CHANNEL = channelName;
			const Organizations = [];
			for (const orgName in channelConfig.organizations) {
				Organizations.push(OrganizationBuilder(orgName, orgsConfig[orgName], 'peer'));
			}
			Profiles[PROFILE_CHANNEL] = {
				Policies: implicitPolicies,
				Capabilities: {
					V1_4_3: true
				},
				Consortium: this.consortiumName,
				Application: {
					Policies: implicitPolicies,
					Organizations,
					Capabilities: {
						V1_4_2: true
					}
				}
			};

		}

		yaml.write({Profiles}, this.configtxFile);
	}
}

module.exports = Configtx;
