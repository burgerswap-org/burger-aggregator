import { Wallet, BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { BurgerConfig } from '../typechain/BurgerConfig'
import { BurgerAggregator } from '../typechain/BurgerAggregator'
import { DexUniswapV2 } from '../typechain/DexUniswapV2'
import { BurgerSwapV2Factory } from '../typechain/BurgerSwapV2Factory'
import { WETH9 } from '../typechain/WETH9'
import { TestERC20 } from '../typechain/TestERC20'
import { expect } from './shared/expect'
import { aggregatorFixture, disableDex0, disableDex1, disableDex2, bigNumber18, bigNumber17, neToken } from './shared/fixtures'
import { abi as ERC20ABI } from '../artifacts/contracts/test/TestERC20.sol/TestERC20.json'


const createFixtureLoader = waffle.createFixtureLoader

describe('BurgerAggregator', async () => {
    let wallet: Wallet, other: Wallet

    let fromToken: TestERC20
    let destToken: TestERC20
    let connector0: TestERC20
    let config: BurgerConfig
    let aggregator: BurgerAggregator
    let dexUniswapV2: DexUniswapV2
    let factory0: BurgerSwapV2Factory
    let weth: WETH9
    let amount = bigNumber18.mul(50)

    let loadFixTure: ReturnType<typeof createFixtureLoader>

    function newToken(token: any) {
        return new ethers.Contract(token, ERC20ABI, wallet)
    }

    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy BurgerAggregator', async () => {
        ; ({ weth, fromToken, destToken, connector0, config, aggregator, dexUniswapV2, factory0 } = await loadFixTure(aggregatorFixture))
    })

    // it('burger aggregator bytecode size', async () => {
    //     expect(((await waffle.provider.getCode(aggregator.address)).length - 2) / 2).to.toMatchSnapshot()
    // })

    describe('#getExpectedReturnWithGas', async () => {
        it('success for fromToken same with destToken', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, fromToken.address, amount, 50, 0, 0)
            expect(res.returnAmount).to.eq(0)
            expect(res.estimateGasAmount).to.eq(0)
            expect(res.distribution.length).to.eq(0)
        })

        it('success for not exist token pair', async () => {
            let res = await aggregator.getExpectedReturnWithGas(neToken, fromToken.address, amount, 50, 0, 0)
            expect(res.returnAmount).to.eq(0)
        })

        it('success for amount', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            expect(res.returnAmount).to.gt(bigNumber18.mul(148))
            expect(res.returnAmount).to.lt(bigNumber18.mul(150))
            expect(res.estimateGasAmount).to.gt(0)
        })

        it('success for distribution', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            expect(res.distribution.length).to.eq(3)
            expect(res.distribution[0]).to.eq(0)
            expect(res.distribution[1]).to.eq(5)
            expect(res.distribution[2]).to.eq(45)
        })

        it('success for single dex - dex0', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 1, disableDex1 + disableDex2, 0)
            expect(res.returnAmount).to.gt(bigNumber18.mul(145))
            expect(res.distribution.length).to.eq(3)
            expect(res.distribution[0]).to.eq(1)
            expect(res.distribution[1]).to.eq(0)
            expect(res.distribution[2]).to.eq(0)
        })

        it('success for single dex returnAmount', async () => {
            let res0 = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 1, disableDex1 + disableDex2, 0)
            let res1 = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 1, disableDex0 + disableDex2, 0)
            let res2 = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 1, disableDex1 + disableDex0, 0)
            expect(res0.returnAmount).to.lt(res1.returnAmount)
            expect(res1.returnAmount).to.lt(res2.returnAmount)
        })

        it('success weth-fromToken', async () => {
            let res = await aggregator.getExpectedReturnWithGas(ethers.constants.AddressZero, fromToken.address, bigNumber18, 50, 0, 0)
            expect(res.returnAmount).to.eq(BigNumber.from('9649080441576288957'))
            expect(res.distribution.length).to.eq(3)
            expect(res.distribution[0]).to.eq(17)
            expect(res.distribution[1]).to.eq(17)
            expect(res.distribution[2]).to.eq(16)
        })
    })

    describe('#getExpectedReturnWithGasMulti', async () => {
        it('fails for wrong tokens length', async () => {
            await expect(aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                [10, 20, 50],
                [0, 0, 0],
                [0, 0, 0],
            )).to.reverted
        })

        it('fails for wrong flags length', async () => {
            await expect(aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                [10, 20],
                [0],
                [0, 0],
            )).to.reverted
        })

        it ('success for fromToken same to connector', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, fromToken.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            expect(res.returnAmounts.length).to.eq(2)
            expect(res.returnAmounts[0]).to.eq(amount)
            expect(res.returnAmounts[1]).to.eq(BigNumber.from('149536433009379990995'))
        })

        it ('success for destToken same to connector', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, destToken.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            expect(res.returnAmounts.length).to.eq(2)
            expect(res.returnAmounts[0]).to.eq(BigNumber.from('149536433009379990995'))
            expect(res.returnAmounts[1]).to.eq(BigNumber.from('149536433009379990995'))
        })

        it ('success for not exist token pair', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [neToken, connector0.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            expect(res.returnAmounts.length).to.eq(2)
            expect(res.returnAmounts[0]).to.eq(0)
            expect(res.returnAmounts[1]).to.eq(0)
        })

        it('success for right returnAmounts', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            expect(res.returnAmounts.length).to.eq(2)
            expect(res.returnAmounts[0]).to.gt(bigNumber18.mul(74))
            expect(res.returnAmounts[1]).to.gt(bigNumber18.mul(148))
            expect(res.estimateGasAmount).to.gt(0)
            expect(res.distribution.length).to.eq(3)
        })

        it('success for single dex - dex0', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti([fromToken.address, connector0.address, destToken.address], amount, [1, 1], [disableDex1 + disableDex2, disableDex1 + disableDex2], [0, 0])
            expect(res.returnAmounts.length).to.eq(2)
            expect(res.returnAmounts[0]).to.gt(bigNumber18.mul(70))
            expect(res.returnAmounts[1]).to.gt(bigNumber18.mul(135))
            expect(res.distribution.length).to.eq(3)
            expect(res.distribution[0]).to.eq(257)
            expect(res.distribution[1]).to.eq(0)
            expect(res.distribution[2]).to.eq(0)
        })

        it('success for single dex returnAmount', async () => {
            let res0 = await aggregator.getExpectedReturnWithGasMulti([fromToken.address, connector0.address, destToken.address], amount, [1, 1], [disableDex1 + disableDex2, disableDex1 + disableDex2], [0, 0])
            let res1 = await aggregator.getExpectedReturnWithGasMulti([fromToken.address, connector0.address, destToken.address], amount, [1, 1], [disableDex0 + disableDex2, disableDex0 + disableDex2], [0, 0])
            let res2 = await aggregator.getExpectedReturnWithGasMulti([fromToken.address, connector0.address, destToken.address], amount, [1, 1], [disableDex1 + disableDex0, disableDex1 + disableDex0], [0, 0])
            expect(res0.returnAmounts[1]).to.lt(res1.returnAmounts[1])
            expect(res1.returnAmounts[1]).to.lt(res2.returnAmounts[1])
        })
    })

    describe('#swap', async () => {
        beforeEach('approve token to aggregator', async () => {
            await fromToken.approve(aggregator.address, BigNumber.from(2).pow(255))
            await destToken.approve(aggregator.address, BigNumber.from(2).pow(255))
        })

        it('success for balance change', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceBefore = await destToken.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            await aggregator.swap(fromToken.address, destToken.address, amount, 0, res.distribution, 0)
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceAfter = await destToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(destTokenBalanceAfter).to.gt(destTokenBalanceBefore)
        })

        it('success for minReturn', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            await aggregator.swap(fromToken.address, destToken.address, amount, res.returnAmount.mul(999).div(1000), res.distribution, 0)
        })

        it('success for emit event', async () => {
            await expect(aggregator.swap(fromToken.address, destToken.address, amount, 0, [0, 5, 45], 0)).to.emit(aggregator, 'Swap')
        })

        it('success for weth-fromToken', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGas(ethers.constants.AddressZero, fromToken.address, bigNumber18, 50, 0, 0)
            await aggregator.swap(ethers.constants.AddressZero, fromToken.address, bigNumber18, res.returnAmount.mul(999).div(1000), res.distribution, 0, { value: bigNumber18 })
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.gt(fromTokenBalanceBefore)
        })

        it('success for fromToken-weth', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let gasBalanceBefore = await wallet.getBalance();
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, ethers.constants.AddressZero, bigNumber18, 50, 0, 0)
            await aggregator.swap(fromToken.address, ethers.constants.AddressZero, bigNumber18, res.returnAmount.mul(999).div(1000), res.distribution, 0)
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let gasBalanceAfter = await wallet.getBalance();
            expect(fromTokenBalanceBefore.sub(fromTokenBalanceAfter)).to.eq(bigNumber18)
            expect(gasBalanceAfter).to.gt(gasBalanceBefore)
        })

        it('gas used', async () => {
            let tx = await aggregator.swap(fromToken.address, destToken.address, amount, 0, [0, 5, 45], 0)
            let receipt = await tx.wait()
            expect(receipt.gasUsed).to.eq(326830)
        })
    })

    describe('#swapMulti', async () => {
        beforeEach('approve token to aggregator', async () => {
            await fromToken.approve(aggregator.address, BigNumber.from(2).pow(255))
        })

        it('fails for wrong flags length', async () => {
            await expect(aggregator.swapMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                0,
                [0, 0, 0],
                [0]
            )).to.revertedWith('Invalid args length')
        })

        it('fails for wrong flags length', async () => {
            await expect(aggregator.swapMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                0,
                [0, 0],
                [0, 0]
            )).to.revertedWith('Invalid distribution')
        })

        it('success for fromToken-connector0-destToken', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let connector0BalanceBefore = await connector0.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            await aggregator.swapMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                0,
                res.distribution,
                [0, 0]
            )
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let connector0BalanceAfter = await connector0.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(connector0BalanceAfter).to.gt(connector0BalanceBefore)
        })

        it('success for weth-connector0-fromToken', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [ethers.constants.AddressZero, connector0.address, fromToken.address],
                bigNumber18,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            await aggregator.swapMulti(
                [ethers.constants.AddressZero, connector0.address, fromToken.address],
                bigNumber18,
                res.returnAmounts[1].mul(99).div(100),
                res.distribution,
                [0, 0],
                { value: bigNumber18 }
            )
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter.sub(fromTokenBalanceBefore)).to.gt(bigNumber18.mul(95))
        })

        it('success for fromToken-connector0-weth', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let gasBalanceBefore = await wallet.getBalance();
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, ethers.constants.AddressZero],
                bigNumber18,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            await aggregator.swapMulti(
                [fromToken.address, connector0.address, ethers.constants.AddressZero],
                bigNumber18,
                res.returnAmounts[1].mul(99).div(100),
                res.distribution,
                [0, 0]
            )
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let gasBalanceAfter = await wallet.getBalance();
            expect(fromTokenBalanceBefore.sub(fromTokenBalanceAfter)).to.eq(bigNumber18)
            expect(gasBalanceAfter).to.gt(gasBalanceBefore)
        })

        it('gas used', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            let tx = await aggregator.swapMulti(
                [fromToken.address, destToken.address, connector0.address],
                amount,
                0,
                res.distribution,
                [0, 0]
            )
            let receipt = await tx.wait()
            expect(receipt.gasUsed).to.eq(555818)
        })
    })

    describe('#multicall', async () => {
        it('success for swap', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGas(ethers.constants.AddressZero, fromToken.address, bigNumber18, 50, 0, 0)
            let data1 = aggregator.interface.encodeFunctionData('swap', [ethers.constants.AddressZero, fromToken.address, bigNumber18, res.returnAmount.mul(999).div(1000), res.distribution, 0])
            await aggregator.multicall([aggregator.address], [data1], { value: bigNumber18 })
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter).to.gt(fromTokenBalanceBefore)
        })

        it('success for swapMulti', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [ethers.constants.AddressZero, connector0.address, fromToken.address],
                bigNumber17.mul(2),
                [20, 20],
                [0, 0],
                [0, 0],
            )
            let data = aggregator.interface.encodeFunctionData(
                'swapMulti',
                [
                    [ethers.constants.AddressZero, connector0.address, fromToken.address],
                    bigNumber17.mul(2),
                    res.returnAmounts[1].mul(99).div(100),
                    res.distribution,
                    [0, 0]
                ]
            )
            await aggregator.multicall([aggregator.address], [data], { value: bigNumber17.mul(2) })
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter.sub(fromTokenBalanceBefore)).to.gt(bigNumber18.mul(19))
        })

        it('success for swap && swapMulti', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)

            let res1 = await aggregator.getExpectedReturnWithGas(ethers.constants.AddressZero, fromToken.address, bigNumber18, 50, 0, 0)
            let data1 = aggregator.interface.encodeFunctionData('swap', [ethers.constants.AddressZero, fromToken.address, bigNumber18, res1.returnAmount.mul(999).div(1000), res1.distribution, 0])

            let res = await aggregator.getExpectedReturnWithGasMulti(
                [ethers.constants.AddressZero, connector0.address, fromToken.address],
                bigNumber18,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            let data = aggregator.interface.encodeFunctionData(
                'swapMulti',
                [
                    [ethers.constants.AddressZero, connector0.address, fromToken.address],
                    bigNumber18,
                    res.returnAmounts[1].mul(99).div(100),
                    res.distribution,
                    [0, 0]
                ]
            )
            await aggregator.multicall([aggregator.address, aggregator.address], [data, data1], { value: bigNumber18.mul(2) })
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            expect(fromTokenBalanceAfter.sub(fromTokenBalanceBefore)).to.gt(bigNumber18.mul(19))
        })
    })

    describe('#fee', async () => {
        beforeEach('set fee && team', async () => {
            await fromToken.approve(aggregator.address, ethers.constants.MaxUint256)
            await destToken.approve(aggregator.address, ethers.constants.MaxUint256)
            aggregator.setFee(BigNumber.from(1000)) // fee: 1/10
            await config.changeTeam(other.address)
        })

        it('success for team', async () => {
            expect(await aggregator.team()).to.eq(other.address)
        })

        it('success for getExpectedReturnWithGas', async () => {
            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            expect(res.returnAmount).to.lt(bigNumber18.mul(135))
            expect(res.returnAmount).to.gt(bigNumber18.mul(134))
        })

        it('success for getExpectedReturnWithGasMulti', async () => {
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            expect(res.returnAmounts[1]).to.lt(bigNumber18.mul(135))
            expect(res.returnAmounts[1]).to.gt(bigNumber18.mul(134))
        })

        it('success for swap', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceBefore = await destToken.balanceOf(wallet.address)
            let otherDestTokenBalanceBefore = await destToken.balanceOf(other.address)

            let res = await aggregator.getExpectedReturnWithGas(fromToken.address, destToken.address, amount, 50, 0, 0)
            await aggregator.swap(fromToken.address, destToken.address, amount, 0, res.distribution, 0)

            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceAfter = await destToken.balanceOf(wallet.address)
            let otherDestTokenBalanceAfter = await destToken.balanceOf(other.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(destTokenBalanceAfter).to.gt(destTokenBalanceBefore)
            expect(otherDestTokenBalanceAfter).to.gt(otherDestTokenBalanceBefore)
        })

        it('successful for swapMulti', async () => {
            let fromTokenBalanceBefore = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceBefore = await destToken.balanceOf(wallet.address)
            let otherDestTokenBalanceBefore = await destToken.balanceOf(other.address)
            let res = await aggregator.getExpectedReturnWithGasMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                [20, 20],
                [0, 0],
                [0, 0],
            )
            await aggregator.swapMulti(
                [fromToken.address, connector0.address, destToken.address],
                amount,
                0,
                res.distribution,
                [0, 0]
            )
            let fromTokenBalanceAfter = await fromToken.balanceOf(wallet.address)
            let destTokenBalanceAfter = await destToken.balanceOf(wallet.address)
            let otherDestTokenBalanceAfter = await destToken.balanceOf(other.address)
            expect(fromTokenBalanceAfter).to.lt(fromTokenBalanceBefore)
            expect(destTokenBalanceAfter).to.gt(destTokenBalanceBefore)
            expect(otherDestTokenBalanceAfter).to.gt(otherDestTokenBalanceBefore)
        })
    })
})