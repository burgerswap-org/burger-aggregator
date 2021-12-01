import { expect } from 'chai'
import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { TestToken } from '../typechain/TestToken';
import { TestTokenFeature } from '../typechain/TestTokenFeature';
import { TestMulticall } from '../typechain/TestMulticall';
import { WETH9 } from '../typechain/WETH9'

describe('Multicall', () => {
    let wallets: Wallet[]
    let token1: TestToken
    let token2: TestToken
    let weth: WETH9
    let tokenFeature1: TestTokenFeature
    let tokenFeature2: TestTokenFeature
    let multiCall: TestMulticall
    before(async () => {
        wallets = await (ethers as any).getSigners()
        const wethFactory = await ethers.getContractFactory('WETH9')
        weth = (await wethFactory.deploy()) as WETH9
        const TokenFactory = await ethers.getContractFactory('TestToken')
        token1 = (await TokenFactory.deploy(8, '10000000000000000000000000000', 'T1', 'ERC20 TestToken 1')) as TestToken
        token2 = (await TokenFactory.deploy(8, '10000000000000000000000000000', 'T2', 'ERC20 TestToken 2')) as TestToken
        const TokenManageFactory = await ethers.getContractFactory('TestTokenFeature')
        tokenFeature1 = (await TokenManageFactory.deploy(weth.address)) as TestTokenFeature
        tokenFeature2 = (await TokenManageFactory.deploy(weth.address)) as TestTokenFeature
        const MultiCallFactory = await ethers.getContractFactory('TestMulticall')
        multiCall = (await MultiCallFactory.deploy(weth.address)) as TestMulticall

        console.log(
        `
        wallet0: ${wallets[0].address}
        wallet1: ${wallets[1].address}
        token1: ${token1.address}
        token2: ${token2.address}
        tokenFeature1: ${tokenFeature1.address}
        tokenFeature2: ${tokenFeature2.address}
        multiCall: ${multiCall.address}
        `
        )
    })

    it('hello', async () => {
        console.info('hello')
    })
  
    it('encode TestTokenFeature transferFrom', async () => {
        let data = tokenFeature1.interface.encodeFunctionData('transferFrom', [token1.address, wallets[1].address, '2000000000000000000'])
        console.info('transferFrom data', data)
    })

    it('TestTokenFeature transferFrom', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        console.info('before balance:', balance0.toString(), balance1.toString())

        await token1.approve(tokenFeature1.address, balance0.toString())
        await tokenFeature1.transferFrom(token1.address, wallets[1].address, '2000000000000000000')

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)
        console.info('after balance:', balance0.toString(), balance1.toString())
    })

    it('TestTokenFeature transferFromAndETH', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        let ethValue = await tokenFeature1.ethValue()
        console.info('before balance:', balance0.toString(), balance1.toString(), ethValue.toString())

        await token1.approve(tokenFeature1.address, balance0.toString())
        await tokenFeature1.transferFromAndETH(token1.address, wallets[1].address, '2000000000000000000', {value: '1000000000000000000'})

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)

        ethValue = await tokenFeature1.ethValue()
        console.info('after balance:', balance0.toString(), balance1.toString(), ethValue.toString())
    })

    it('TestTokenFeature saveToWeth', async () => {
        let ethValue = await tokenFeature1.ethValue()
        let wethValue = await weth.balanceOf(tokenFeature1.address)
        console.info('before balance:', ethValue.toString(), wethValue.toString())

        await tokenFeature1.saveToWeth('1000000000000000000', {value: '1000000000000000000'})

        ethValue = await tokenFeature1.ethValue()
        wethValue = await weth.balanceOf(tokenFeature1.address)
        console.info('after balance:', ethValue.toString(), wethValue.toString())
    })

    it('multiCall transferFrom', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 before balance:', balance0.toString(), balance1.toString())
        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 before balance:', balance0.toString(), balance1.toString())
        let data1 = tokenFeature1.interface.encodeFunctionData('transferFrom', [token1.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature1 data', data1)
        let data2 = tokenFeature1.interface.encodeFunctionData('transferFrom', [token2.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature2 data', data2)

        await token1.approve(multiCall.address, balance0.toString())
        await token2.approve(multiCall.address, balance0.toString())
        await multiCall.multicall([tokenFeature1.address, tokenFeature2.address], [data1, data2])

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 after balance:', balance0.toString(), balance1.toString())

        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 after balance:', balance0.toString(), balance1.toString())
    })

    it('multiCall transferFromAndETH', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 before balance:', balance0.toString(), balance1.toString())
        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 before balance:', balance0.toString(), balance1.toString())
        let data1 = tokenFeature1.interface.encodeFunctionData('transferFromAndETH', [token1.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature1 data', data1)
        let data2 = tokenFeature1.interface.encodeFunctionData('transferFromAndETH', [token2.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature2 data', data2)

        await token1.approve(multiCall.address, balance0.toString())
        await token2.approve(multiCall.address, balance0.toString())
        await multiCall.multicall([tokenFeature1.address, tokenFeature2.address], [data1, data2], {value: '1000000000000000000'})

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 after balance:', balance0.toString(), balance1.toString())

        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 after balance:', balance0.toString(), balance1.toString())
    })

    it('multiCall saveToWeth', async () => {
        let wethAddress = await multiCall.weth()
        console.log('wethAddress', wethAddress)
        let wethValue = await weth.balanceOf(multiCall.address)
        console.info('before balance:', wethValue.toString())

        let data1 = tokenFeature1.interface.encodeFunctionData('saveToWeth', ['1000000000000000000'])
        console.info('tokenFeature1 data', data1)
        await multiCall.multicall([tokenFeature1.address], [data1], {value: '1000000000000000000'})

        wethValue = await weth.balanceOf(multiCall.address)
        console.info('after balance:', wethValue.toString())
    })


    it('multiCall testTransferFrom', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 before balance:', balance0.toString(), balance1.toString())
        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 before balance:', balance0.toString(), balance1.toString())
        let data1 = multiCall.interface.encodeFunctionData('testTransferFrom', [tokenFeature1.address, token1.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature1 data', data1)
        let data2 = multiCall.interface.encodeFunctionData('testTransferFrom', [tokenFeature2.address, token2.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature2 data', data2)

        await token1.approve(multiCall.address, balance0.toString())
        await token2.approve(multiCall.address, balance0.toString())
        await multiCall.multicall([multiCall.address, multiCall.address], [data1, data2])

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 after balance:', balance0.toString(), balance1.toString())

        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 after balance:', balance0.toString(), balance1.toString())
    })

    it('multiCall testTransferFromList', async () => {
        let balance0 = await token1.balanceOf(wallets[0].address)
        let balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 before balance:', balance0.toString(), balance1.toString())
        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 before balance:', balance0.toString(), balance1.toString())
        let data1 = multiCall.interface.encodeFunctionData('testTransferFromList', [[tokenFeature1.address, tokenFeature2.address], [token1.address, token2.address], [wallets[1].address, wallets[1].address], ['2000000000000000000', '2000000000000000000']])
        console.info('tokenFeature1 data', data1)
        let data2 = multiCall.interface.encodeFunctionData('testTransferFrom', [tokenFeature2.address, token2.address, wallets[1].address, '2000000000000000000'])
        console.info('tokenFeature2 data', data2)

        await token1.approve(multiCall.address, balance0.toString())
        await token2.approve(multiCall.address, balance0.toString())
        await multiCall.multicall([multiCall.address, multiCall.address], [data1, data2])

        balance0 = await token1.balanceOf(wallets[0].address)
        balance1 = await token1.balanceOf(wallets[1].address)
        console.info('token1 after balance:', balance0.toString(), balance1.toString())

        balance0 = await token2.balanceOf(wallets[0].address)
        balance1 = await token2.balanceOf(wallets[1].address)
        console.info('token2 after balance:', balance0.toString(), balance1.toString())
    })
  })
  