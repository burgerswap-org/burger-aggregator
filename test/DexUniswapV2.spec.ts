import { Wallet, BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { DexUniswapV2 } from '../typechain/DexUniswapV2'
import { BurgerSwapV2Factory } from '../typechain/BurgerSwapV2Factory'
import { WETH9 } from '../typechain/WETH9'
import { TestERC20 } from '../typechain/TestERC20'
import { expect } from './shared/expect'
import { dexFixture, bigNumber18, bigNumber17, neToken } from './shared/fixtures'

const createFixtureLoader = waffle.createFixtureLoader

describe('DexUniswapV2', async () => {
    let wallet: Wallet, other: Wallet
    let fromToken: TestERC20
    let destToken: TestERC20
    let weth: WETH9

    let dexUniswapV2: DexUniswapV2
    let factory: BurgerSwapV2Factory

    let amounts = [bigNumber18.mul(50)] // swap 50 fromToken to destToken

    let loadFixTure: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy DexUniswapV2', async () => {
        ; ({weth, fromToken, destToken, dexUniswapV2, factory } = await loadFixTure(dexFixture))
    })

    // it('burger DexUniswapV2 bytecode size', async () => {
    //     expect(((await waffle.provider.getCode(dexUniswapV2.address)).length - 2) / 2).to.toMatchSnapshot()
    // })

    describe('#getTokenPrice', async () => {
        it('fails for wrong from token', async () => {
            expect(await dexUniswapV2.getTokenPrice(factory.address, ethers.constants.AddressZero, destToken.address)).to.eq(bigNumber18.mul(10))
        })

        it('success', async () => {
            let res = await dexUniswapV2.getTokenPrice(factory.address, fromToken.address, destToken.address)
            expect(res).to.eq(bigNumber17.mul(15))
        })
    })

    describe('#getRate', async () => {
        it('success', async () => {
            let res = await dexUniswapV2.getRate(factory.address, fromToken.address, destToken.address, ethers.constants.AddressZero)
            expect(res.rate).to.eq(bigNumber17.mul(15))
        })

        it('success for fromToken same to destToken', async () => {
            let res = await dexUniswapV2.getRate(factory.address, fromToken.address, fromToken.address, ethers.constants.AddressZero)
            expect(res.rate).to.eq(0)
            expect(res.weight).to.eq(0)
        })

        it('success for fromToken same to connector', async () => {
            let res = await dexUniswapV2.getRate(factory.address, fromToken.address, destToken.address, fromToken.address)
            expect(res.rate).to.eq(0)
            expect(res.weight).to.eq(0)
        })

        it('success for destToken same to connector', async () => {
            let res = await dexUniswapV2.getRate(factory.address, fromToken.address, destToken.address, destToken.address)
            expect(res.rate).to.eq(0)
            expect(res.weight).to.eq(0)
        })

        it('success for not exist token', async () => {
            let res = await dexUniswapV2.getRate(factory.address, neToken, destToken.address, ethers.constants.AddressZero)
            expect(res.rate).to.eq(0)
            expect(res.weight).to.eq(0)
        })
    })

    describe('#calculateOnDex', async () => {
        it('fails for wrong from token', async () => {
            expect((await dexUniswapV2.calculateOnDex(factory.address, ethers.constants.AddressZero, destToken.address, [0]))[0][0]).to.eq(0)
        })

        it('fails for wrong dest token', async () => {
            expect((await dexUniswapV2.calculateOnDex(factory.address, fromToken.address, ethers.constants.AddressZero, [0]))[0][0]).to.eq(0)
        })

        it('fails for not exist token pair', async () => {
            let res = await dexUniswapV2.calculateOnDex(factory.address, fromToken.address, neToken, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.eq(0)
        })

        it('fails for same token', async () => {
            let res = await dexUniswapV2.calculateOnDex(factory.address, fromToken.address, fromToken.address, amounts)
            expect(res.rets.length).to.eq(1)
            expect(res.rets[0]).to.eq(bigNumber18.mul(50))
        })

        it('success for calculate equal 0', async () => {
            expect((await dexUniswapV2.calculateOnDex(factory.address, fromToken.address, destToken.address, [0]))[0][0]).to.eq(0)
        })

        it('success for less than 75', async () => {
            expect((await dexUniswapV2.calculateOnDex(factory.address, fromToken.address, destToken.address, amounts))[0][0]).to.lt(bigNumber18.mul(75))
        })

        it('success for great than 74', async () => {
        })

        it('success for weth-weth', async () => {
            let res = await dexUniswapV2.calculateOnDex(factory.address, ethers.constants.AddressZero, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", amounts)
            expect(res.rets[0]).to.eq(BigNumber.from(0))
        })
    })

    describe('#swapOnDex', async () => {
        it('success for swap fromToken to destToken', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceBefore = await destToken.balanceOf(wallet.address)
            await fromToken.transfer(dexUniswapV2.address, bigNumber18.mul(20))
            await dexUniswapV2.swapOnDex(factory.address, fromToken.address, destToken.address, bigNumber18.mul(20), wallet.address)
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceAfter = await destToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(destTokenBalanceAfter).to.gt(destTokenBalanceBefore)
        })

        it('success for swap gas-token', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let gasTokenBalanceBefore = await wallet.getBalance()
            await dexUniswapV2.swapOnDex(factory.address, ethers.constants.AddressZero, fromToken.address, bigNumber18.mul(2), wallet.address, {value: bigNumber18.mul(2)})
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let gasTokenBalanceAfter = await wallet.getBalance()
            expect(gasTokenBalanceBefore.sub(gasTokenBalanceAfter)).to.gt(bigNumber18.mul(2))
            expect(fromTokenBalanceAfter.sub(fromTokenBalanceBefore)).to.gt(bigNumber18)
        })

        it('success for swap token-gas', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let gasTokenBalanceBefore = await wallet.getBalance()
            await fromToken.transfer(dexUniswapV2.address, bigNumber18.mul(20))
            await dexUniswapV2.swapOnDex(factory.address, fromToken.address, ethers.constants.AddressZero, bigNumber18.mul(20), wallet.address)
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let gasTokenBalanceAfter = await wallet.getBalance()
            expect(fromTokenBalanceBefore.sub(fromTokenBalanceAfter)).to.eq(bigNumber18.mul(20))
            expect(gasTokenBalanceAfter.sub(gasTokenBalanceBefore)).to.gt(bigNumber17.mul(16))
        })

        it('fails for swap weth-weth', async () => {
            await expect(dexUniswapV2.swapOnDex(factory.address, ethers.constants.AddressZero, "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", bigNumber18.mul(2), wallet.address, {value: bigNumber18.mul(2)})).to.reverted
        })

        it('gas used', async () => {
            await fromToken.transfer(dexUniswapV2.address, bigNumber18.mul(20))
            let tx = await dexUniswapV2.swapOnDex(factory.address, fromToken.address, destToken.address, bigNumber18.mul(20), wallet.address)
            let receipt = await tx.wait();
            expect(receipt.gasUsed).to.eq(140706);
        })
    })
})