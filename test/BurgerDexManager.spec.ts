import { Wallet } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { BurgerDexManager } from '../typechain/BurgerDexManager'
import { expect } from './shared/expect'


const { constants } = ethers
const createFixtureLoader = waffle.createFixtureLoader

const TestProtocal = ["0x1000000000000000000000000000000000000000", "0x1000000000000000000000000000000000000000", "0x1000000000000000000000000000000000000000"]
const TestDex = ["0x1100000000000000000000000000000000000000", "0x1200000000000000000000000000000000000000", "0x1300000000000000000000000000000000000000"]
const TestFlags = ['16777216', '33554432', '67108864']
const TestDexName = ['dex1', 'dex2', 'dex3']

describe('BurgerDexManager', () => {
    let wallet: Wallet, other: Wallet
    let manager: BurgerDexManager

    const fixture = async () => {
        const factoryFactory = await ethers.getContractFactory('BurgerDexManager')
        return (await factoryFactory.deploy()) as BurgerDexManager
    }

    let loadFixTure: ReturnType<typeof createFixtureLoader>
    before('create fixture loader', async () => {
        [wallet, other] = await (ethers as any).getSigners()
        loadFixTure = createFixtureLoader([wallet, other])
    })

    beforeEach('deploy BurgerDexManager', async () => {
        manager = await loadFixTure(fixture)
        await manager.initialize()
    })

    it('owner is deployer', async () => {
        expect(await manager.owner()).to.equal(wallet.address)
        expect(await manager.admin()).to.equal(wallet.address)
        expect(await manager.dev()).to.equal(wallet.address)
    })

    // it('manager bytecode size', async () => {
    //     expect(((await waffle.provider.getCode(manager.address)).length - 2) / 2).to.toMatchSnapshot()
    // })

    describe('#setOwner', async () => {
        it('fails if caller is not owner', async () => {
            await expect(manager.connect(other).changeOwner(other.address)).to.be.reverted
        })

        it('updates owner', async () => {
            await manager.changeOwner(other.address)
            expect(await manager.owner()).to.eq(other.address)
        })

        it('emits event', async () => {
            await expect(manager.changeOwner(other.address)).to.emit(manager, 'OwnerChanged').withArgs(wallet.address, wallet.address, other.address)
        })

        it('can not be called by original owner', async () => {
            await manager.changeOwner(other.address)
            await expect(manager.changeOwner(wallet.address)).to.be.reverted
        })
    })

    describe('#setProtocal', () => {
        it('fails if caller is not owner', async () => {
            await expect(manager.connect(other.address).setProtocol(TestProtocal[0], TestDex[0], TestFlags[0], TestDexName[0])).to.be.reverted
        })

        it('fails if protocal or dex is zero address', async () => {
            await expect(manager.setProtocol(constants.AddressZero, TestDex[0], TestFlags[0], TestDexName[0])).to.be.reverted
            await expect(manager.setProtocol(TestProtocal[0], constants.AddressZero, TestFlags[0], TestDexName[0])).to.be.reverted
        })

        it('succeeds set', async () => {
            await manager.setProtocol(TestProtocal[0], TestDex[0], TestFlags[0], TestDexName[0])
            expect(await manager.dexLength()).to.eq(1)
            expect(await manager.pids(TestDex[0])).to.eq(0)
            expect(await manager.dexMapProtocol(TestDex[0])).to.eq(TestProtocal[0])
        })

        it('succeeds update dex', async () => {
            await manager.setProtocol(TestProtocal[0], TestDex[0], TestFlags[0], TestProtocal[0])
            await manager.setProtocol(TestProtocal[0], TestDex[0], 0, TestDexName[0])
            expect((await manager.dexs(0))[2]).to.eq(0)
        })

        it('emit event', async () => {
            await expect(manager.setProtocol(
                TestProtocal[0],
                TestDex[0],
                TestFlags[0],
                TestDexName[0]
            ))
                .to
                .emit(manager, 'SetProtocal')
                .withArgs(
                    TestProtocal[0],
                    TestDex[0],
                    TestFlags[0],
                    TestDexName[0]
                )
        })
    })

    describe('#batchSetProtocal', async () => {
        it('fails if caller is not owner', async () => {
            await expect(manager.connect(other.address).batchSetProtocol(
                TestProtocal,
                TestDex,
                TestFlags,
                TestDexName
            )).to.be.reverted
        })

        it('fails if array length is not same', async () => {
            await expect(manager.batchSetProtocol(
                [TestProtocal[0], TestProtocal[0]],
                TestDex,
                TestFlags,
                TestDexName
            )).to.be.revertedWith('invalid parameters')
        })

        it('succeeds', async () => {
            await manager.batchSetProtocol(
                TestProtocal,
                TestDex,
                TestFlags,
                TestDexName
            )
            expect(await manager.dexLength()).to.eq(3)
        })
    })
})