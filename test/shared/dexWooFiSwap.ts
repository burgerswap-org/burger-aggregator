import { BigNumber, Wallet, utils } from 'ethers'
import { ethers } from 'hardhat'
import { TestERC20 } from '../../typechain/TestERC20'
import { WETH9 } from '../../typechain/WETH9'
import { WooPP } from '../../typechain/WooPP'
import { WooRouter } from '../../typechain/WooRouter'
import { DexWooFiswap } from '../../typechain/DexWooFiswap'
import { Fixture, deployMockContract } from 'ethereum-waffle'
import { abi as IWooracleABI } from '../../artifacts/contracts/test/Wooracle.sol/IWooracle.json'
import { abi as IWooGuardianABI } from '../../artifacts/contracts/test/WooGuardian.sol/IWooGuardian.json'

export const bigNumber18 = BigNumber.from("1000000000000000000")  // 1e18
export const bigNumber17 = BigNumber.from("100000000000000000")  //1e17
export const neToken = "0x0000000000000000000000000000000000000111"
const BTC_PRICE = 60000
const WOO_PRICE = 1.2
const BNB_PRICE = 523

interface DexWooFiswapFixture {
    weth: WETH9
    btc: TestERC20
    woo: TestERC20
    usdt: TestERC20
    wooRouter: WooRouter
    dexWooFiswap: DexWooFiswap
}

export const dexWooFiswapFixture: Fixture<DexWooFiswapFixture> = async function ([wallet, other]: Wallet[]): Promise<DexWooFiswapFixture> {
    let wethFactory = await ethers.getContractFactory('WETH9')
    let weth = (await wethFactory.deploy()) as WETH9
    await weth.deposit({value: bigNumber18.mul(50)})
    let tokenFactory = await ethers.getContractFactory('TestERC20')
    let token0 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token1 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token2 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let [btc, woo, usdt] = [token0, token1, token2].sort((tokenA, tokenB) =>
        tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? -1 : 1
    )

    let wooGuardian = await deployMockContract(wallet, IWooGuardianABI)
    await wooGuardian.mock.checkSwapPrice.returns()
    await wooGuardian.mock.checkSwapAmount.returns()
    await wooGuardian.mock.checkInputAmount.returns()

    let wooracle = await deployMockContract(wallet, IWooracleABI)
    await wooracle.mock.timestamp.returns(BigNumber.from(1634180070))
    await wooracle.mock.state.withArgs(btc.address).returns(
        utils.parseEther(BTC_PRICE.toString()),
        BigNumber.from('200000000000000'),
        BigNumber.from('1000000000'),
        true
    )
    await wooracle.mock.state.withArgs(woo.address).returns(
        utils.parseEther(WOO_PRICE.toString()),
        BigNumber.from('6000000000000000'),
        BigNumber.from('500000000000'),
        true
    )
    await wooracle.mock.state.withArgs(weth.address).returns(
        utils.parseEther(BNB_PRICE.toString()),
        BigNumber.from('400000000000000'),
        BigNumber.from('5000000000'),
        true
    )

    let wooPPFactory = await ethers.getContractFactory('WooPP')
    let wooPP = (await wooPPFactory.deploy(usdt.address, wooracle.address, wooGuardian.address)) as WooPP
    let wooRouterFactory = await ethers.getContractFactory('WooRouter')
    let wooRouter = (await wooRouterFactory.deploy(weth.address, wooPP.address)) as WooRouter

    const threshold = 0
    const lpFeeRate = 0
    const R = BigNumber.from(0)
    await wooPP.addBaseToken(btc.address, threshold, lpFeeRate, R)
    await wooPP.addBaseToken(woo.address, threshold, lpFeeRate, R)
    await wooPP.addBaseToken(weth.address, threshold, lpFeeRate, R)

    await btc.transfer(wooPP.address, bigNumber18.mul(10))
    await woo.transfer(wooPP.address, bigNumber18.mul(500000))
    await weth.transfer(wooPP.address, bigNumber18.mul(50))
    await usdt.transfer(wooPP.address, bigNumber18.mul(2000000))

    let dexWooFiswapFactory = await ethers.getContractFactory('DexWooFiswap')
    let dexWooFiswap = (await dexWooFiswapFactory.deploy(weth.address)) as DexWooFiswap

    return { weth, btc, woo, usdt, wooRouter, dexWooFiswap }
}