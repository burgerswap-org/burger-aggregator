import { Wallet, constants } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { WooRouter } from '../typechain/WooRouter'
import { TestERC20 } from '../typechain/TestERC20'
import { DexWooFiswap } from '../typechain/DexWooFiswap'
import { expect } from './shared/expect'
import { dexWooFiswapFixture, bigNumber18, bigNumber17, neToken } from './shared/dexWooFiSwap'
const createFixtureLoader = waffle.createFixtureLoader

describe('DexWooFiSwap', async () => {
    let wallet: Wallet, other: Wallet

    let usdt: TestERC20
    let woo: TestERC20
    let wooRouter: WooRouter
    let dexWooFiswap: DexWooFiswap

    let loadFixTure: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy DexWooFiSwap', async () => {
        ; ({ woo, usdt, wooRouter, dexWooFiswap } = await loadFixTure(dexWooFiswapFixture))
    })

    describe('#calculateOnDex', async () => {
        it('success for calculate woo-usdt', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, woo.address, usdt.address, [bigNumber18.mul(100)])
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(bigNumber18.mul(119))
        })

        it('success for calculate weth-usdt', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, constants.AddressZero, usdt.address, [bigNumber18.mul(10)])
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(bigNumber18.mul(5200))
        })

        it('success for calculate usdt-woo', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, usdt.address, woo.address, [bigNumber18.mul(120)])
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(bigNumber18.mul(99))
        })

        it('success for calculate usdt-weth', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, usdt.address, constants.AddressZero, [bigNumber18.mul(1000)])
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(bigNumber17.mul(19))
        })

        it('success for calculate weth-woo', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, constants.AddressZero, woo.address, [bigNumber18.mul(12)])
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.gt(bigNumber18.mul(5190))
        })

        it('success for calculate neToken-usdt', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, neToken, usdt.address, [bigNumber18.mul(10), bigNumber18.mul(10)])
            expect(res.rets.length).to.eq(2)
            expect(res.rets[0]).to.eq(0)
            expect(res.rets[1]).to.eq(0)
        })

        it('success for calculate neToken-woo', async () => {
            let res = await dexWooFiswap.calculateOnDex(wooRouter.address, neToken, woo.address, [bigNumber18.mul(10), bigNumber18.mul(10)])
            expect(res.rets.length).to.eq(2)
            expect(res.rets[0]).to.eq(0)
            expect(res.rets[1]).to.eq(0)
        })
    })

    describe('#swap', async () => {
        it('success for swap woo-usdt', async () => {
            await woo.transfer(other.address, bigNumber18.mul(100))
            let otherWooBalanceBefore = await woo.balanceOf(other.address)
            let otherUsdtBalanceBefore = await usdt.balanceOf(other.address)
            woo.connect(other).transfer(dexWooFiswap.address, bigNumber18.mul(100))
            await dexWooFiswap.connect(other).swapOnDex(wooRouter.address, woo.address, usdt.address, bigNumber18.mul(100), other.address)
            let otherWooBalanceAfter = await woo.balanceOf(other.address)
            let otherUsdtBalanceAfter = await usdt.balanceOf(other.address)
            expect(otherWooBalanceBefore.sub(otherWooBalanceAfter)).to.eq(bigNumber18.mul(100))
            expect(otherUsdtBalanceAfter.sub(otherUsdtBalanceBefore)).to.gt(bigNumber18.mul(104))
        })

        it('success for swap weth-usdt', async () => {
            let otherGasBalanceBefore = await other.getBalance()
            let otherUsdtBalanceBefore = await usdt.balanceOf(other.address)
            await dexWooFiswap.connect(other).swapOnDex(wooRouter.address, constants.AddressZero, usdt.address, bigNumber18.mul(1), other.address, { value: bigNumber18.mul(1) })
            let otherGasBalanceAfter = await other.getBalance()
            let otherUsdtBalanceAfter = await usdt.balanceOf(other.address)
            expect(otherGasBalanceBefore.sub(otherGasBalanceAfter)).gt(bigNumber18.mul(1))
            expect(otherGasBalanceBefore.sub(otherGasBalanceAfter)).lt(bigNumber17.mul(15))
            expect(otherUsdtBalanceAfter.sub(otherUsdtBalanceBefore)).gt(bigNumber18.mul(520))
        })

        it('success for swap usdt-weth', async () => {
            await usdt.transfer(other.address, bigNumber18.mul(1000))
            let otherUsdtBalanceBefore = await usdt.balanceOf(other.address)
            let otherGasBalanceBefore = await other.getBalance()
            usdt.connect(other).transfer(dexWooFiswap.address, bigNumber18.mul(530))
            await dexWooFiswap.connect(other).swapOnDex(wooRouter.address, usdt.address, constants.AddressZero, bigNumber18.mul(530), other.address)
            let otherUsdtBalanceAfter = await usdt.balanceOf(other.address)
            let otherGasBalanceAfter = await other.getBalance()
            expect(otherGasBalanceAfter.sub(otherGasBalanceBefore)).gt(bigNumber18.mul(1))
            expect(otherUsdtBalanceBefore.sub(otherUsdtBalanceAfter)).eq(bigNumber18.mul(530))
        })

        it('success for swap weth-usdt-woo', async () => {
            let otherGasBalanceBefore = await other.getBalance()
            let otherWooBalanceBefore = await woo.balanceOf(other.address)
            await dexWooFiswap.connect(other).swapOnDex(wooRouter.address, constants.AddressZero, woo.address, bigNumber17.mul(12), other.address, { value: bigNumber17.mul(12) })
            let otherGasBalanceAfter = await other.getBalance()
            let otherWooBalanceAfter = await woo.balanceOf(other.address)
            expect(otherGasBalanceBefore.sub(otherGasBalanceAfter)).gt(bigNumber17.mul(12))
            expect(otherGasBalanceBefore.sub(otherGasBalanceAfter)).lt(bigNumber17.mul(15))
            expect(otherWooBalanceAfter.sub(otherWooBalanceBefore)).gt(bigNumber18.mul(520))
        })

        it('swap gas used', async () => {
            await woo.transfer(other.address, bigNumber18.mul(100))
            woo.connect(other).transfer(dexWooFiswap.address, bigNumber18.mul(100))
            let tx = await dexWooFiswap.connect(other).swapOnDex(wooRouter.address, woo.address, usdt.address, bigNumber18.mul(100), other.address)
            let receipt = await tx.wait()
            expect(receipt.gasUsed).to.eq(279942)
        })
    })
})