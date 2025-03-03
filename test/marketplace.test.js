const { assert } = require('chai');
const Marketplace = artifacts.require('./Marketplace.sol');

require('chai')
    .use(require('chai-as-promised'))
    .should();

contract('Marketplace', (accounts) => {
    let marketplace;
    const seller = accounts[0]; // Define seller
    const buyer = accounts[1]; // Define buyer
    const deployer = accounts[2]; // Define deployer

    before(async () => {
        marketplace = await Marketplace.deployed();
    });

    describe('deployment', async () => {
        it('deployed successfully', async () => {
            const address = await marketplace.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, "");
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has a name', async () => {
            const name = await marketplace.name();
            assert.equal(name, "emmytech");
        });
    });

    describe('products', async () => {
        let result, productCount;
        
        before(async () => {
            result = await marketplace.createProduct('iPhone X', web3.utils.toWei('1', 'Ether'), { from: seller });
            productCount = await marketplace.productCount();
        });

        it('creates products', async () => {
            // Success 
            assert.equal(productCount, 1);
            const event = result.logs[0].args;
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct');
            assert.equal(event.name, 'iPhone X', 'name is correct');
            assert.equal(event.price, '1000000000000000000', 'price is correct');
            assert.equal(event.owner, seller, 'owner is correct');
            assert.equal(event.purchased, false, 'purchased is correct');

            // Failure: Product must have a name
            await marketplace.createProduct('', web3.utils.toWei('1', 'Ether'), { from: seller }).should.be.rejected;

            // Failure: Product must have a price
            await marketplace.createProduct('iPhone X', 0, { from: seller }).should.be.rejected;
        });

        it('sells products', async () => {
            // Track the seller balance before purchase
            let oldSellerBalance = new web3.utils.BN(await web3.eth.getBalance(seller));
          
            // SUCCESS: Buyer makes purchase
            result = await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether')});
          
            // Check logs
            const event = result.logs[0].args;
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct');
            assert.equal(event.name, 'iPhone X', 'name is correct');
            assert.equal(event.price, '1000000000000000000', 'price is correct');
            assert.equal(event.owner, buyer, 'owner is correct');
            assert.equal(event.purchased, true, 'purchased is correct');
          
            // Check that seller received funds
            let newSellerBalance = new web3.utils.BN(await web3.eth.getBalance(seller));
            let price = new web3.utils.BN(web3.utils.toWei('1', 'Ether'));
            const expectedBalance = oldSellerBalance.add(price);
          
            assert.equal(newSellerBalance.toString(), expectedBalance.toString());
          
            // FAILURE: Tries to buy a product that does not exist
            await marketplace.purchaseProduct(99, { from: buyer, value: web3.utils.toWei('1', 'Ether')}).should.be.rejected;

            // FAILURE: Buyer tries to buy without enough ether
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('0.5', 'Ether') }).should.be.rejected;

            // FAILURE: Deployer tries to buy the product, i.e., product can't be purchased twice
            await marketplace.purchaseProduct(productCount, { from: deployer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;

            // FAILURE: Buyer tries to buy again, i.e., buyer can't be the seller
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;
        });
    });
});
