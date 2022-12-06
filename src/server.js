const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const app = express()
const port = 4000

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../../test-application/javascript/AppUtil.js');
const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

let ccp, caClient, wallet;
function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}
/**
 * * Middlewares
 */
app.use(express.urlencoded())
app.use(express.json())
app.use(morgan('dev'))
app.use(cors())

/**
 * * Routes
 */
app.get('/', async (req, res) => {
	// res.send({a: 'asdada'})
    try {
        const gateway = new Gateway();

        await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
        const network = await gateway.getNetwork(channelName);

		const contract = network.getContract(chaincodeName);

        console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
		let result = await contract.evaluateTransaction('GetAllAssets');
        console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        res.send(prettyJSONString(result.toString()))
    } catch (error) {
        console.error("Error: ", error)
    }
})

app.post("/read", async(req, res) => {
	try {
		const gateway = new Gateway()
		
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true }
		})
		const network = await gateway.getNetwork(channelName)
		const contract = network.getContract(chaincodeName)

		console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
		let result = await contract.evaluateTransaction('ReadAsset', req.body.curp)
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		res.send(prettyJSONString(result.toString()))
	} catch (error) {
		res.send(`Error: ${req.body.curp} no existe`)
		console.error("Error: ", error)
	}
})

app.post("/create", async(req, res) => {
	try {
		const { curp } = req.body
		const expstr = JSON.stringify(req.body)

		const gateway = new Gateway()
		
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true }
		})
		const network = await gateway.getNetwork(channelName)
		const contract = network.getContract(chaincodeName)

		console.log('\n--> Submit Transaction: CreateAsset, creates new asset');
		let result = await contract.submitTransaction('CreateAsset', curp, expstr);
		console.log('*** Result: committed');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		res.send(prettyJSONString(result.toString()))	
	} catch (error) {
		res.send(`Error: no se pudo crear el expediente`)
		console.error("Error: ", error)
	}
})

app.post('/update', async(req, res) => {
	try {
		const { curp } = req.body
		const expstr = JSON.stringify(req.body)

		const gateway = new Gateway()
		
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true }
		})
		const network = await gateway.getNetwork(channelName)
		const contract = network.getContract(chaincodeName)

		console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
		await contract.submitTransaction('UpdateAsset', curp, expstr);

		console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
		let result = await contract.evaluateTransaction('ReadAsset', curp)
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);

		res.send(prettyJSONString(result.toString()))
	} catch (error) {
		res.send(`Error: no se pudo actualizar el expediente`)
		console.error("Error: ", error)
	}
})


/**
 * * Server listener
 */
app.listen(port, async () => {
    ccp = buildCCPOrg1();

	caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

	wallet = await buildWallet(Wallets, walletPath);

	await enrollAdmin(caClient, wallet, mspOrg1);

	await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

	try {
        const gateway = new Gateway();

        await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
        const network = await gateway.getNetwork(channelName);

		const contract = network.getContract(chaincodeName);

		console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
		await contract.submitTransaction('InitLedger');
		console.log('*** Result: committed');
    } catch (error) {
        console.error("Error: ", error)
    }

    console.log(`Server running on port ${port}`)
})