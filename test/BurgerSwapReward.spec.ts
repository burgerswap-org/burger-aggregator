import { Wallet, BigNumber } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { BurgerSwapReward } from '../typechain/BurgerSwapReward'
import { Burger } from '../typechain/Burger'
import { TestERC20 } from '../typechain/TestERC20'
import { expect } from './shared/expect'
import { burgerSwapRewardFixture, bigNumber18, bigNumber17 } from './shared/fixtures'

const createFixtureLoader = waffle.createFixtureLoader

describe('BurgerSwapReward', async () => {
    let wallet: Wallet, other: Wallet

    let burgerSwapReward: BurgerSwapReward
    let burger: Burger
    let token1: TestERC20
    let token2: TestERC20
    let token3: TestERC20
    let token4: TestERC20

    let loadFixTure: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy BurgerSwapReward', async () => {
        ; ({ fromToken: token1, destToken: token2, connector0: token3, connector1: token4, burgerSwapReward, burger } = await loadFixTure(burgerSwapRewardFixture))
    })

    it('checkout', async () => {
        expect(await burger.owner()).to.eq(wallet.address)
        expect(await burgerSwapReward.owner()).to.eq(wallet.address)
    })

    describe('#setRate', async () => {
        it('success for set rate', async () => {
            await burgerSwapReward.setRate(token1.address, bigNumber17)
            expect(await burgerSwapReward.pids(token1.address)).to.eq(1);
            expect((await burgerSwapReward.poolLength())).to.eq(2)
            expect((await burgerSwapReward.pools(1)).token).to.eq(token1.address)
        })

        it('success for update rate', async () => {
            await burgerSwapReward.setRate(token1.address, bigNumber17)
            await burgerSwapReward.setRate(token1.address, bigNumber17.mul(2))
            expect((await burgerSwapReward.poolLength())).to.eq(2)
            expect((await burgerSwapReward.pools(1)).rate).to.eq(bigNumber17.mul(2))
        })

        it('success for zero token set rate', async () => {
            await burgerSwapReward.setRate(ethers.constants.AddressZero, bigNumber17)
            expect((await burgerSwapReward.poolLength())).to.eq(2)
            expect((await burgerSwapReward.pools(1)).token).to.eq(ethers.constants.AddressZero)
        })
    })

    describe('#addReward', async () => {
        beforeEach('set white list && set rate', async () => {
            await burgerSwapReward.setWhiteList(wallet.address, true)
            await burgerSwapReward.setBaseRate(bigNumber18)
            await burgerSwapReward.batchSetRate(
                [ethers.constants.AddressZero, token1.address, token2.address],
                [bigNumber17.mul(2), bigNumber17, bigNumber17]
            )
        })

        it('success for token1-token2', async () => {
            await burgerSwapReward.addReward(
                wallet.address,
                token1.address,
                token2.address,
                bigNumber18.mul(2),
                bigNumber18.mul(5)
            )
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(bigNumber17.mul(5))
        })

        it('success for zerotoken-token2', async () => {
            await burgerSwapReward.addReward(
                wallet.address,
                ethers.constants.AddressZero,
                token2.address,
                bigNumber18.mul(5),
                bigNumber18.mul(5)
            )
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(bigNumber17.mul(10))
        })

        it('success for one not exist token', async () => {
            await burgerSwapReward.addReward(
                wallet.address,
                ethers.constants.AddressZero,
                token3.address,
                bigNumber18.mul(5),
                bigNumber18.mul(5)
            )
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(bigNumber17.mul(10))
        })

        it('success for two not exist token', async () => {
            await burgerSwapReward.addReward(
                wallet.address,
                token3.address,
                token4.address,
                bigNumber18.mul(5),
                bigNumber18.mul(5)
            )
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(0)
        })
    })

    describe('#claimReward', async () => {
        beforeEach('mock addReward', async () => {
            await burgerSwapReward.setWhiteList(wallet.address, true)
            await burgerSwapReward.setBaseRate(bigNumber18)
            await burgerSwapReward.batchSetRate(
                [ethers.constants.AddressZero, token1.address, token2.address],
                [bigNumber17.mul(2), bigNumber17, bigNumber17]
            )
            await burgerSwapReward.addReward(
                wallet.address,
                ethers.constants.AddressZero,
                token2.address,
                bigNumber18.mul(5),
                bigNumber18.mul(5)
            )
            await burgerSwapReward.addReward(
                wallet.address,
                token1.address,
                token2.address,
                bigNumber18.mul(5),
                bigNumber18.mul(5)
            )
        })

        it('success', async () => {
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(bigNumber17.mul(15))
            let balanceBefore = await burger.balanceOf(wallet.address)
            await burgerSwapReward.claimReward()
            let balanceAfter = await burger.balanceOf(wallet.address)
            expect(balanceAfter.sub(balanceBefore)).to.eq(bigNumber17.mul(15))
            expect(await burgerSwapReward.queryReward(wallet.address)).to.eq(0)
        })
    })
})