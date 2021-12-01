import { BigNumber, Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TestERC20 } from '../../typechain/TestERC20'
import { DgasTest } from '../../typechain/DgasTest'
import { DemaxPlatform } from '../../typechain/DemaxPlatform'
import { DemaxConfig } from '../../typechain/DemaxConfig'
import { DemaxTransferListener } from '../../typechain/DemaxTransferListener'
import { DemaxPool } from '../../typechain/DemaxPool'
import { DemaxFactory } from '../../typechain/DemaxFactory'
import { DexUniswapV2 } from '../../typechain/DexUniswapV2'
import { DexBurgerswap } from '../../typechain/DexBurgerswap'
import { BurgerSwapV2Factory } from '../../typechain/BurgerSwapV2Factory'
import { BurgerSwapV2Router } from '../../typechain/BurgerSwapV2Router'
import { BurgerAggregator } from '../../typechain/BurgerAggregator'
import { BurgerDexManager } from '../../typechain/BurgerDexManager'
import { BurgerSwapReward } from '../../typechain/BurgerSwapReward'
import { BurgerConfig } from '../../typechain/BurgerConfig'
import { AggregatorRouter } from '../../typechain/AggregatorRouter'
import { Burger } from '../../typechain/Burger'
import { WETH9 } from '../../typechain/WETH9'
import { Fixture } from 'ethereum-waffle'

export const disableDex0 = 1
export const disableDex1 = 2
export const disableDex2 = 4
export const bigNumber18 = BigNumber.from("1000000000000000000")  // 1e18
export const bigNumber17 = BigNumber.from("100000000000000000")  //1e17
export const neToken = "0x0000000000000000000000000000000000000111"
const dev = "0x07fF0ed51ABAf0ebeF2dDdabB463A0E17235de46"

const deadLine = BigNumber.from("7920777600")

interface TokensFixture {
    weth: WETH9
    usdt: TestERC20
    fromToken: TestERC20
    destToken: TestERC20
    connector0: TestERC20
    connector1: TestERC20
    connector2: TestERC20
}

async function tokensFixture(): Promise<TokensFixture> {
    const wethFactory = await ethers.getContractFactory('WETH9')
    const weth = (await wethFactory.deploy()) as WETH9
    let tokenFactory = await ethers.getContractFactory('TestERC20')
    let token0 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token1 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token2 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token3 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token4 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let token5 = (await tokenFactory.deploy(bigNumber18.mul(1000000000))) as TestERC20
    let [usdt, fromToken, destToken, connector0, connector1, connector2] = [token0, token1, token2, token3, token4, token5].sort((tokenA, tokenB) =>
        tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? -1 : 1
    )
    return { weth, usdt, fromToken, destToken, connector0, connector1, connector2 }
}


interface DexFixture extends TokensFixture {
    dexUniswapV2: DexUniswapV2
    factory: BurgerSwapV2Factory
    router: BurgerSwapV2Router
}

export const dexFixture: Fixture<DexFixture> = async function ([wallet, other]: Wallet[]): Promise<DexFixture> {
    const { weth, usdt, fromToken, destToken, connector0, connector1, connector2 } = await tokensFixture();
    const dexUniswapV2Factory = await ethers.getContractFactory('DexUniswapV2')
    const factoryFactory = await ethers.getContractFactory('BurgerSwapV2Factory')
    const routerFactory = await ethers.getContractFactory('BurgerSwapV2Router')

    const dexUniswapV2 = (await dexUniswapV2Factory.deploy(weth.address)) as DexUniswapV2
    const factory = (await factoryFactory.deploy()) as BurgerSwapV2Factory
    const router = (await routerFactory.deploy(factory.address, weth.address)) as BurgerSwapV2Router

    await fromToken.approve(router.address, BigNumber.from(2).pow(255))
    await destToken.approve(router.address, BigNumber.from(2).pow(255))
    await router.addLiquidityETH(
        fromToken.address,
        bigNumber18.mul(100),
        0,
        0,
        wallet.address,
        deadLine,
        { value: bigNumber18.mul(10) }
    )
    await router.addLiquidityETH(
        destToken.address,
        bigNumber18.mul(100),
        0,
        0,
        wallet.address,
        deadLine,
        { value: bigNumber18.mul(10) }
    )
    await router.addLiquidity(
        fromToken.address,
        destToken.address,
        bigNumber18.mul(10000),
        bigNumber18.mul(15000),
        0,
        0,
        wallet.address,
        BigNumber.from("7920777600")
    )

    return { weth, usdt, fromToken, destToken, connector0, connector1, connector2, dexUniswapV2, factory, router }
}


interface DexBurgerswapFixture extends TokensFixture {
    dexBurgerswap: DexBurgerswap
    dgas: DgasTest
    factory: DemaxFactory
    platform: DemaxPlatform
}

export const dexBurgerswapFixture: Fixture<DexBurgerswapFixture> = async function ([wallet, other]: Wallet[]): Promise<DexBurgerswapFixture> {
    const { weth, usdt, fromToken, destToken, connector0, connector1, connector2 } = await tokensFixture();
    const res = await burgerswapV2DexFixture(weth, usdt, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(1000));

    return { weth, usdt, dgas: res.dgas, fromToken, destToken, connector0, connector1, connector2, dexBurgerswap: res.dexBurgerswap, factory: res.factory, platform: res.platform }
}


interface AggregatorFixture extends TokensFixture {
    config: BurgerConfig
    aggregator: BurgerAggregator
    dexUniswapV2: DexUniswapV2
    factory0: BurgerSwapV2Factory
}

export const aggregatorFixture: Fixture<AggregatorFixture> = async function (): Promise<AggregatorFixture> {
    const { weth, usdt, fromToken, destToken, connector0, connector1, connector2 } = await tokensFixture();
    const configFactory = await ethers.getContractFactory('BurgerConfig')
    const managerFactory = await ethers.getContractFactory('BurgerDexManager')
    const aggregatorFactory = await ethers.getContractFactory('BurgerAggregator')
    const protocalFactory = await ethers.getContractFactory('DexUniswapV2')

    const config = (await configFactory.deploy()) as BurgerConfig
    await config.initialize()
    const manager = (await managerFactory.deploy()) as BurgerDexManager
    await manager.initialize()
    const aggregator = (await aggregatorFactory.deploy(weth.address)) as BurgerAggregator
    await aggregator.configure(manager.address, ethers.constants.AddressZero, ethers.constants.AddressZero, 0)
    await aggregator.setupConfig(config.address)
    const dexUniswapV2 = (await protocalFactory.deploy(weth.address)) as DexUniswapV2
    const factory0 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(1000))
    const factory1 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(10000))
    const factory2 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(100000))
    await manager.batchSetProtocol(
        [
            dexUniswapV2.address,
            dexUniswapV2.address,
            dexUniswapV2.address
        ],
        [
            factory0.address,
            factory1.address,
            factory2.address
        ],
        [
            BigNumber.from("1"),
            BigNumber.from("2"),
            BigNumber.from("4")
        ],
        [
            'dex0',
            'dex1',
            'dex2'
        ]
    )

    return { weth, usdt, fromToken, destToken, connector0, connector1, connector2, config, aggregator, dexUniswapV2, factory0 }
}

async function uniswapV2DexFixture(
    weth: WETH9,
    fromToken: TestERC20,
    destToken: TestERC20,
    connector0: TestERC20,
    connector1: TestERC20,
    connector2: TestERC20,
    muls: BigNumber
): Promise<BurgerSwapV2Factory> {
    let factoryFactory = await ethers.getContractFactory('BurgerSwapV2Factory')
    let routerFactory = await ethers.getContractFactory('BurgerSwapV2Router')

    let factory = (await factoryFactory.deploy()) as BurgerSwapV2Factory
    let router = (await routerFactory.deploy(factory.address, weth.address)) as BurgerSwapV2Router
    await fromToken.approve(router.address, BigNumber.from(2).pow(255))
    await destToken.approve(router.address, BigNumber.from(2).pow(255))
    await connector0.approve(router.address, BigNumber.from(2).pow(255))
    await connector1.approve(router.address, BigNumber.from(2).pow(255))
    await connector2.approve(router.address, BigNumber.from(2).pow(255))
    // weth:fromToken = 10: 1000
    await router.addLiquidityETH(
        fromToken.address,
        bigNumber18.mul(100),
        0,
        0,
        dev,
        deadLine,
        { value: bigNumber18.mul(10) }
    )
    // weth:connector0 = 10:1500
    await router.addLiquidityETH(
        connector0.address,
        bigNumber18.mul(1500),
        0,
        0,
        dev,
        deadLine,
        { value: bigNumber18.mul(10) }
    )
    // fromToken:destToken = 5:15
    await router.addLiquidity(
        fromToken.address,
        destToken.address,
        bigNumber18.mul(5).mul(muls),
        bigNumber18.mul(15).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    // fromToken:connector0:destToken = 1:1.5:3
    await router.addLiquidity(
        fromToken.address,
        connector0.address,
        bigNumber17.mul(10).mul(muls),
        bigNumber17.mul(15).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    await router.addLiquidity(
        connector0.address,
        destToken.address,
        bigNumber17.mul(15).mul(muls),
        bigNumber17.mul(30).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    // fromToken:connector1:destToken = 2:3:6
    await router.addLiquidity(
        fromToken.address,
        connector1.address,
        bigNumber18.mul(2).mul(muls),
        bigNumber18.mul(3).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    await router.addLiquidity(
        connector1.address,
        destToken.address,
        bigNumber18.mul(3).mul(muls),
        bigNumber18.mul(6).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    // fromToken:connector2:destToken = 2:3:6
    await router.addLiquidity(
        fromToken.address,
        connector2.address,
        bigNumber18.mul(2).mul(muls),
        bigNumber18.mul(3).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )
    await router.addLiquidity(
        connector2.address,
        destToken.address,
        bigNumber18.mul(3).mul(muls),
        bigNumber18.mul(6).mul(muls),
        0,
        0,
        dev,
        deadLine,
    )

    return factory
}


interface BurserswapV2Dex {
    factory: DemaxFactory
    platform: DemaxPlatform
    dgas: DgasTest
    dexBurgerswap: DexBurgerswap
}

async function burgerswapV2DexFixture(
    weth: WETH9,
    usdt: TestERC20,
    fromToken: TestERC20,
    destToken: TestERC20,
    connector0: TestERC20,
    connector1: TestERC20,
    connector2: TestERC20,
    muls: BigNumber
): Promise<BurserswapV2Dex> {
    const dgasTestFactory = await ethers.getContractFactory('DgasTest')
    const dgas = (await dgasTestFactory.deploy()) as DgasTest
    const platformFactory = await ethers.getContractFactory('DemaxPlatform')
    const platform = (await platformFactory.deploy()) as DemaxPlatform
    const configFactory = await ethers.getContractFactory('DemaxConfig')
    const config = (await configFactory.deploy()) as DemaxConfig
    const transferListenerFactory = await ethers.getContractFactory('DemaxTransferListener')
    const transferListener = (await transferListenerFactory.deploy()) as DemaxTransferListener
    const poolFactory = await ethers.getContractFactory('DemaxPool')
    const pool = (await poolFactory.deploy()) as DemaxPool
    const factoryFactory = await ethers.getContractFactory('DemaxFactory')
    const demaxFactory = (await factoryFactory.deploy(dgas.address, config.address)) as DemaxFactory
    const protocalFactory = await ethers.getContractFactory('DexBurgerswap')
    const dexBurgerswap = (await protocalFactory.deploy(weth.address)) as DexBurgerswap
    const governanace = config
    await transferListener.initialize(dgas.address, demaxFactory.address, weth.address, platform.address, dev)
    await pool.initialize(dgas.address, weth.address, demaxFactory.address, platform.address, config.address, governanace.address)
    await platform.initialize(dgas.address, config.address, demaxFactory.address, weth.address, governanace.address, transferListener.address, pool.address)
    await config.initialize(dgas.address, governanace.address, platform.address, dev, [dgas.address, weth.address, usdt.address])
    await dgas.upgradeImpl(transferListener.address)
    await dexBurgerswap.configure(platform.address)

    await dgas.approve(platform.address, BigNumber.from(2).pow(255))
    await fromToken.approve(platform.address, BigNumber.from(2).pow(255))
    await destToken.approve(platform.address, BigNumber.from(2).pow(255))
    await platform.addLiquidityETH(
        dgas.address,
        bigNumber18.mul(100),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("7920777600"),
        { value: bigNumber18.mul(100) }
    )
    await platform.addLiquidity(
        dgas.address,
        fromToken.address,
        bigNumber18.mul(10000),
        bigNumber18.mul(20000),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("7920777600")
    )
    await platform.addLiquidity(
        dgas.address,
        destToken.address,
        bigNumber18.mul(10000),
        bigNumber18.mul(30000),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("7920777600")
    )
    await platform.addLiquidity(
        fromToken.address,
        destToken.address,
        bigNumber18.mul(10000),
        bigNumber18.mul(15000),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("7920777600")
    )

    return { factory: demaxFactory, platform, dgas, dexBurgerswap }
}


interface BurgerSwapRewardFixture extends TokensFixture {
    burgerSwapReward: BurgerSwapReward
    burger: Burger
}

export const burgerSwapRewardFixture: Fixture<BurgerSwapRewardFixture> = async function (): Promise<BurgerSwapRewardFixture> {
    const { weth, usdt, fromToken, destToken, connector0, connector1, connector2 } = await tokensFixture();
    let burgerFactory = await ethers.getContractFactory('Burger')
    let burger = (await burgerFactory.deploy()) as Burger
    await burger.initialize()
    let burgerSwapRewardFactory = await ethers.getContractFactory('BurgerSwapReward')
    let burgerSwapReward = (await burgerSwapRewardFactory.deploy()) as BurgerSwapReward
    await burger.increaseFund(burgerSwapReward.address, ethers.constants.MaxUint256)
    await burgerSwapReward.initialize(burger.address)
    return { weth, usdt, fromToken, destToken, connector0, connector1, connector2, burgerSwapReward, burger }
}


interface AggregatorRouterFixture extends TokensFixture {
    manager: BurgerDexManager
    router: AggregatorRouter
}

export const aggregatorRouterFixture: Fixture<AggregatorRouterFixture> = async function (): Promise<AggregatorRouterFixture> {
    const { weth, usdt, fromToken, destToken, connector0, connector1, connector2 } = await tokensFixture();
    const managerFactory = await ethers.getContractFactory('BurgerDexManager')
    const protocalFactory = await ethers.getContractFactory('DexUniswapV2')
    const routerFactory = await ethers.getContractFactory('AggregatorRouter')

    const manager = (await managerFactory.deploy()) as BurgerDexManager
    await manager.initialize()
    const dexUniswapV2 = (await protocalFactory.deploy(weth.address)) as DexUniswapV2
    const factory0 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(1000))
    const factory1 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(10000))
    const factory2 = await uniswapV2DexFixture(weth, fromToken, destToken, connector0, connector1, connector2, BigNumber.from(100000))
    await manager.batchSetProtocol(
        [
            dexUniswapV2.address,
            dexUniswapV2.address,
            dexUniswapV2.address
        ],
        [
            factory0.address,
            factory1.address,
            factory2.address
        ],
        [
            BigNumber.from("1"),
            BigNumber.from("2"),
            BigNumber.from("4")
        ],
        [
            'dex0',
            'dex1',
            'dex2'
        ]
    )
    const router = (await routerFactory.deploy()) as AggregatorRouter
    await router.initialize()
    await router.configure(manager.address)

    return { weth, usdt, fromToken, destToken, connector0, connector1, connector2, manager, router }
}