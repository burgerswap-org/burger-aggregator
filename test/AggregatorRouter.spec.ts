import { Wallet, BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { TestERC20 } from '../typechain/TestERC20'
import { AggregatorRouter } from '../typechain/AggregatorRouter'
import { BurgerDexManager } from '../typechain/BurgerDexManager'
import { expect } from './shared/expect'
import { aggregatorRouterFixture,  disableDex0, disableDex1, disableDex2, neToken } from './shared/fixtures'
import { getDistribution } from './utils/util'

const createFixtureLoader = waffle.createFixtureLoader
const parts = 10 // 20
const times = 100

describe('Router', async () => {
    let wallet: Wallet, other: Wallet

    let fromToken: TestERC20
    let destToken: TestERC20
    let connector0: TestERC20
    let connector1: TestERC20
    let connector2: TestERC20
    let manager: BurgerDexManager
    let router: AggregatorRouter

    let amount = BigNumber.from("50000000000000000000") // swap 50 fromToken to destToken

    let loadFixTure: ReturnType<typeof createFixtureLoader>

    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy AggregatorRouter', async () => {
        ; ({ fromToken, destToken, connector0, connector1, connector2, manager, router } = await loadFixTure(aggregatorRouterFixture))
    })

    describe('#getRoutesDistribution', async () => {
        beforeEach('add dex and connector', async () => {
            await router.batchAddConnector([connector0.address, connector1.address, connector2.address])
        })

        it('fails for same tokens', async () => {
            await expect(router.getRoutesDistribution(fromToken.address, fromToken.address, 0)).to.revertedWith('Tokens should not be the same')
        })

        it('success for not exist token pair', async () => {
            let res = await router.getRoutesDistribution(fromToken.address, neToken, 0)
            expect(res.routes.length).to.eq(4)
            let distribution = getDistribution(res.distribution, parts, times)
            expect(distribution.length).to.eq(4)
            expect(distribution[0]).to.eq(0)
            expect(distribution[1]).to.eq(0)
            expect(distribution[2]).to.eq(0)
            expect(distribution[3]).to.eq(0)
        })

        it('success for fromToken same to connector0', async () => {
            let res = await router.getRoutesDistribution(connector0.address, destToken.address, 0)
            expect(res.routes.length).to.eq(4)
            let distribution = getDistribution(res.distribution, parts, times)
            expect(distribution.length).to.eq(4)
            expect(distribution[0]).to.eq(10)
            expect(distribution[1]).to.eq(0)
            expect(distribution[2]).to.eq(0)
            expect(distribution[3]).to.eq(0)
        })

        it('success for destToken same to connector0', async () => {
            let res = await router.getRoutesDistribution(fromToken.address, connector0.address, 0)
            expect(res.routes.length).to.eq(4)
            let distribution = getDistribution(res.distribution, parts, times)
            expect(distribution.length).to.eq(4)
            expect(distribution[0]).to.eq(10)
            expect(distribution[1]).to.eq(0)
            expect(distribution[2]).to.eq(0)
            expect(distribution[3]).to.eq(0)
        })

        it('success for right routes', async () => {
            let res = await router.getRoutesDistribution(fromToken.address, destToken.address, 0)
            expect(res.routes.length).to.eq(4)
            expect(res.routes[0].length).to.eq(3)
            expect(res.routes[0][0]).to.eq(fromToken.address)
            expect(res.routes[0][1]).to.eq(ethers.constants.AddressZero)
            expect(res.routes[0][2]).to.eq(destToken.address)
            expect(res.routes[1].length).to.eq(3)
            expect(res.routes[1][0]).to.eq(fromToken.address)
            expect(res.routes[1][1]).to.eq(connector0.address)
            expect(res.routes[1][2]).to.eq(destToken.address)
        })

        it('success for right distribution', async () => {
            let res = await router.getRoutesDistribution(fromToken.address, destToken.address, 0)
            expect(res.distribution.length).to.eq(4)
            let distribution = getDistribution(res.distribution, parts, times)
            expect(distribution[0]).to.eq(5)
            expect(distribution[1]).to.eq(1)
            expect(distribution[2]).to.eq(2)
            expect(distribution[3]).to.eq(2)
        })

        it('success for single dex - dex1', async () => {
            let res = await router.getRoutesDistribution(fromToken.address, destToken.address, disableDex1 + disableDex2)
            expect(res.distribution.length).to.eq(4)
            let distribution = getDistribution(res.distribution, parts, times)
            expect(distribution[0]).to.eq(5)
            expect(distribution[1]).to.eq(1)
            expect(distribution[2]).to.eq(2)
            expect(distribution[3]).to.eq(2)
        })
    })

    describe('#getRate', async () => {
        beforeEach('add dex and connector', async () => {
            await router.batchAddConnector([connector0.address, connector1.address, connector2.address])
        })

        it('fails for same tokens', async () => {
            await expect(router.getRoutesDistribution(fromToken.address, fromToken.address, 0)).to.revertedWith('Tokens should not be the same')
        })

        it('success for not exist token pair', async () => {
            expect(await router.getRate(neToken, destToken.address, 0)).to.eq(0)
        })

        it('success for right weightedRate', async () => {
            expect(await router.getRate(fromToken.address, destToken.address, 0)).to.eq(BigNumber.from('3000000000000000000'))
        })
    })
})