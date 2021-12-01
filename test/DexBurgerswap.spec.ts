import { Wallet, BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { DexBurgerswap } from '../typechain/DexBurgerswap'
import { DemaxFactory } from '../typechain/DemaxFactory'
import { DemaxPlatform } from '../typechain/DemaxPlatform'
import { TestERC20 } from '../typechain/TestERC20'
import { WETH9 } from '../typechain/WETH9'
import { DgasTest } from '../typechain/DgasTest'
import { expect } from './shared/expect'
import { dexBurgerswapFixture, bigNumber18, bigNumber17, neToken } from './shared/fixtures'
const createFixtureLoader = waffle.createFixtureLoader

describe('DexBurgerSwap', async () => {
    let wallet: Wallet, other: Wallet
    let fromToken: TestERC20
    let destToken: TestERC20
    let weth: WETH9
    let dexBurgerswap: DexBurgerswap
    let dgas: DgasTest
    let factory: DemaxFactory
    let platform: DemaxPlatform
    let amounts = [bigNumber18.mul(50)]

    let loadFixTure: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy DexBurgerswap', async () => {
        ; ({ weth, fromToken, destToken, dexBurgerswap, dgas, factory, platform } = await loadFixTure(dexBurgerswapFixture))
    })

    it('check create pair and add liqudity', async () => {
        expect(await platform.existPair(dgas.address, fromToken.address)).to.eq(true)
        let res0 = await platform.getReserves(dgas.address, fromToken.address)
        expect(res0[0]).to.eq(bigNumber18.mul(10000))
        expect(res0[1]).to.eq(bigNumber18.mul(20000))
        expect(await platform.existPair(fromToken.address, destToken.address)).to.eq(true)
        let res1 = await platform.getReserves(fromToken.address, destToken.address)
        expect(res1[0]).to.eq(bigNumber18.mul(10000))
        expect(res1[1]).to.eq(bigNumber18.mul(15000))
    })

    describe('#getTokenPrice', async () => {
        it('success', async () => {
            let res0 = await dexBurgerswap.getTokenPrice(factory.address, dgas.address, fromToken.address)
            expect(res0).to.eq(bigNumber17.mul(20)) // times 1e18
            let res1 = await dexBurgerswap.getTokenPrice(factory.address, fromToken.address, destToken.address)
            expect(res1).to.eq(bigNumber17.mul(15)) // times 1e18
        })
    })

    describe('#calculateOnDex', async () => {
        it('success for calculate equal 0', async () => {
            expect((await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, destToken.address, [0]))[0][0]).to.eq(0)
        })

        it('success for not exist token pair', async () => {
            let res = await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, neToken, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.eq(0)
        })

        it('success for same token', async () => {
            let res = await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, fromToken.address, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.eq(bigNumber18.mul(50))
        })

        it('success for calculate equal 0', async () => {
            expect((await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, destToken.address, [0]))[0][0]).to.eq(0)
        })

        it('success for calculate for fromToken-gas', async () => {
            let res = await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, ethers.constants.AddressZero, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.eq(0)
        })

        it('success for calculate for dgas-gas', async () => {
            let res = await dexBurgerswap.calculateOnDex(factory.address, dgas.address, ethers.constants.AddressZero, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(0)
        })

        it('success for less than 75', async () => {
            expect((await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, destToken.address, amounts))[0][0]).to.lt(bigNumber18.mul(75))
        })

        it('success for great than 74', async () => {
            expect((await dexBurgerswap.calculateOnDex(factory.address, fromToken.address, destToken.address, amounts))[0][0]).to.gt(bigNumber18.mul(74))
        })
    })

    describe('#swapOnDex', async () => {
        it('success for swap fromToken to destToken', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceBefore = await destToken.balanceOf(wallet.address)
            await fromToken.transfer(dexBurgerswap.address, bigNumber18.mul(20))
            await dexBurgerswap.swapOnDex(factory.address, fromToken.address, destToken.address, bigNumber18.mul(20), wallet.address)
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceAfter = await destToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(destTokenBalanceAfter).to.gt(destTokenBalanceBefore)
        })

        it('checkout for the dgas-gas liquidity', async () => {
            let res = await platform.getReserves(dgas.address, weth.address)
            expect(res[0]).to.eq(bigNumber18.mul(100))
            expect(res[1]).to.eq(bigNumber18.mul(100))
        })

        it('debug for the platform getAmountsOut', async () => {
            let res = await platform.getAmountsOut(bigNumber18.mul(2), [dgas.address, weth.address])
            expect(res[0]).to.eq(bigNumber18.mul(2))
        })

        it('success for swap dgas-gas', async () => {
            let dgasTokenBalanceBefore = await dgas.balanceOf(wallet.address)
            let gasTokenBalanceBefore = await wallet.getBalance()
            await dgas.transfer(dexBurgerswap.address, bigNumber18.mul(2))
            await dexBurgerswap.swapOnDex(factory.address, dgas.address, ethers.constants.AddressZero, bigNumber18.mul(2), wallet.address)
            let dgasTokenBalanceAfter = await dgas.balanceOf(wallet.address)
            let gasTokenBalanceAfter = await wallet.getBalance()
            expect(dgasTokenBalanceBefore.sub(dgasTokenBalanceAfter)).to.eq(bigNumber18.mul(2))
            expect(gasTokenBalanceAfter.sub(gasTokenBalanceBefore)).to.gt(bigNumber18)
        })

        it('success for swap gas-dgas', async () => {
            let gasTokenBalanceBefore = await wallet.getBalance()
            let dgasTokenBalanceBefore = await dgas.balanceOf(wallet.address)
            await dexBurgerswap.swapOnDex(factory.address, ethers.constants.AddressZero, dgas.address, bigNumber18.mul(2), wallet.address, { value: bigNumber18.mul(2) })
            let gasTokenBalanceAfter = await wallet.getBalance()
            let dgasTokenBalanceAfter = await dgas.balanceOf(wallet.address)
            expect(gasTokenBalanceBefore.sub(gasTokenBalanceAfter)).to.gt(bigNumber18.mul(2))
            expect(dgasTokenBalanceAfter.sub(dgasTokenBalanceBefore)).to.gt(bigNumber18)
        })

        it('gas used', async () => {
            await fromToken.transfer(dexBurgerswap.address, bigNumber18.mul(20))
            let tx = await dexBurgerswap.swapOnDex(factory.address, fromToken.address, destToken.address, bigNumber18.mul(20), wallet.address)
            let receipt = await tx.wait();
            expect(receipt.gasUsed).to.eq(274347);
        })
    })
})