import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { sleep } from "sleep-ts";

// tokens
const weth = '0x7FcCaDD3e6A3F80e194CaDf13FeDF36B9BBbe98F'
const usdt = '0xF2ED382e6A3439Be124813842200cf6702fD6ecA'
const busd = '0xCC36337919dCE00519eb7a7013C97e79cC33D14f'
const usdc = '0xE1106e7396dEA8c298Af67C1cdd732e0f3F32361'
const tta = '0x941Af07A986b92f7584e78999E73D124e823Ee0B'
const ttb = '0x6a6E31Bd0a803e012ad3F59A83B207F39A748Dea'

// dexs
let uniswapV2Dexs = [
  {
    name: "pancakeFactory",
    address: '0x09cD2234a6AaA9159B279655a218d268D9D9006F',
    router: '0xbac161A35F68763eBF85b9C3435bc8D5a4Dbd74e',
    muls: 1000
  },
  {
    name: "mdexFactory",
    address: '0x64E047A35B4b9a27D3016982Ba70b6315A32e61C',
    router: '0x1a62bA8C227f6Fad2D21B7c3aD861Ea136A98546',
    muls: 100
  },
  {
    name: "biSwapFactory",
    address: '0x3dBA57618f44f80981d5AAddD4Aa0ad29351e833',
    router: '0x4550CD0b71F825f644BC336e8A2F2EC9f1B823Fb',
    muls: 100
  },
  {
    name: "apeSwapFactory",
    address: '0x4eB2614c2C2890c5Bd31dBb64d3C1e9eeCB9Ef36',
    router: '0x289580b420c7324949Cc47F54706Ca8D3bEbc093',
    muls: 50
  },
  {
    name: "bakerySwapFactory",
    address: '0x9bC5E5E943861915694C898145CEF38eC86A808B',
    router: '0x28e7622B28097A8611B67B9709D2dA418811Bf6b',
    muls: 50
  },
  {
    name: "babySwapFactory",
    address: '0x6CCC14fe7c239C50A272Bb8dd1037652b3399B60',
    router: '0x5c4F715a80A3bf3305FB44753b7e8e78c2245126',
    muls: 1
  }
]
let burgerswapV2Dexs = [
  {
    name: "burgerSwapFactory",
    address: '0x7EA51c334fF1b0Af2b8706D1f0F54BF16d9bB992',
    platform: '0x9F1d1427FDAeDFc6745E263D44743414495c35Ed',
    config: '0xf956Cda0f2Bd2a5054ADeD2f41298501ac52b0F2',
    transferListener: '0xba25Aa25A2dE681D12eBd1AD8D987A071a48F77f',
    pool: '0xd23e908160FeD0F7795A205CF20650aBCce2771C',
    dgas: '0x06bF890dfF5b422c35c9683f47d2d7663f6E1c24',
    muls: 50
  }
]
let wooFiswapDexs = [
  {
    name: "WooFiSwap",
    wooGuardian: '0x596115C8fFc50614b1E4f9D2CfaE34065aA5A8D6',
    wooracle: '0x2Da48033FB8f175BaA214a29cA4095d5FEf04dF9',
    wooPP: '0x607A9F63cDDdF8AA11CAFF727e3d54edB05C6ce5',
    wooRouter: '0xc1F485De4F94BB3B09873adA497B4DCc67fa2Ed9'
  }
]

// constants
const bigNumber18 = BigNumber.from('1000000000000000000');
const bigNumber17 = BigNumber.from('100000000000000000');
const deadLine = BigNumber.from('1956499200');

async function waitForMint(tx: any) {
  let result = null
  do {
    result = await ethers.provider.getTransactionReceipt(tx)
    await sleep(500)
  } while (result === null)
  await sleep(500)
}

async function deployTokens() {
  console.log('============start to deploy tokens============');

  // deploy weth
  const wethFactory = await ethers.getContractFactory('WETH9')
  let wethIns = await wethFactory.deploy();
  await wethIns.deployed();
  console.log('weth: ', wethIns.address)

  // deploy usdt
  let usdtFactory = await ethers.getContractFactory('TestERC20')
  let usdtIns = await usdtFactory.deploy(bigNumber18.mul(100000000));
  await usdtIns.deployed();
  console.log('usdt: ', usdtIns.address)

  // deploy busd
  let busdFactory = await ethers.getContractFactory('TestERC20')
  let busdIns = await busdFactory.deploy(bigNumber18.mul(100000000));
  await busdIns.deployed();
  console.log('busd: ', busdIns.address)

  // deploy usdc
  let usdcFactory = await ethers.getContractFactory('TestERC20')
  let usdcIns = await usdcFactory.deploy(bigNumber18.mul(100000000));
  await usdcIns.deployed();
  console.log('usdc: ', usdcIns.address)

  // deploy tta
  let ttaFactory = await ethers.getContractFactory('TestERC20')
  let ttaIns = await ttaFactory.deploy(bigNumber18.mul(100000000));
  await ttaIns.deployed();
  console.log('tta: ', ttaIns.address)

  // deploy ttb
  let ttbFactory = await ethers.getContractFactory('TestERC20')
  let ttbIns = await ttbFactory.deploy(bigNumber18.mul(100000000));
  await ttbIns.deployed();
  console.log('ttb: ', ttbIns.address)

  console.log('============end to deploy tokens============');
}

async function deployDexUniswapV2(name: string, muls: BigNumber) {
  console.log(`============start to deploy ${name} dex============`);
  let signer = ethers.provider.getSigner();
  let wallet = await signer.getAddress();

  // deploy factory
  let factoryFactory = await ethers.getContractFactory('BurgerSwapV2Factory')
  let factoryIns = await factoryFactory.deploy();
  await factoryIns.deployed();
  console.log('deploy factory success: ', factoryIns.address);

  // deploy router
  let routerFactory = await ethers.getContractFactory('BurgerSwapV2Router')
  let routerIns = await routerFactory.deploy(factoryIns.address, weth);
  await routerIns.deployed();
  console.log('deploy router success: ', routerIns.address);

  // usdt approve to router
  let usdtIns = await ethers.getContractAt('TestERC20', usdt);
  let tx = await usdtIns.approve(routerIns.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('usdt approve success: ', tx.hash);

  // busd approve to router
  let busdIns = await ethers.getContractAt('TestERC20', busd);
  tx = await busdIns.approve(routerIns.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('busd approve success: ', tx.hash);

  // usdc approve to router
  let usdcIns = await ethers.getContractAt('TestERC20', usdc);
  tx = await usdcIns.approve(routerIns.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('usdc approve success: ', tx.hash);

  // tta approve to router
  let ttaIns = await ethers.getContractAt('TestERC20', tta);
  tx = await ttaIns.approve(routerIns.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('tta approve success: ', tx.hash);

  // ttb approve to router
  let ttbIns = await ethers.getContractAt('TestERC20', ttb);
  tx = await ttbIns.approve(routerIns.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('ttb approve success: ', tx.hash);

  // add liquidity tta-ttb 1:3
  tx = await routerIns.addLiquidity(
    tta,
    ttb,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(3).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity tta-ttb success: ', tx.hash);

  // add liquidity tta-usdt 1:3
  tx = await routerIns.addLiquidity(
    tta,
    usdt,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(3).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity tta-usdt success: ', tx.hash);

  // add liquidity usdt-ttb 1:1
  tx = await routerIns.addLiquidity(
    usdt,
    ttb,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity usdt-ttb success: ', tx.hash);

  // add liquidity tta-busd 1:3
  tx = await routerIns.addLiquidity(
    tta,
    busd,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(3).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity tta-busd success: ', tx.hash);

  // add liquidity busd-ttb 1:1
  tx = await routerIns.addLiquidity(
    busd,
    ttb,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity busd-ttb success: ', tx.hash);

  // add liquidity tta-usdc 1:3
  tx = await routerIns.addLiquidity(
    tta,
    usdc,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(3).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity tta-usdc success: ', tx.hash);

  // add liquidity usdc-ttb 1:1
  tx = await routerIns.addLiquidity(
    usdc,
    ttb,
    bigNumber18.mul(1000).mul(muls),
    bigNumber18.mul(1000).mul(muls),
    0,
    0,
    wallet,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity usdc-ttb success: ', tx.hash);

  // add liquidity weth-tta 0.2:20
  tx = await routerIns.addLiquidityETH(
    tta,
    bigNumber18.mul(20),
    0,
    0,
    wallet,
    deadLine,
    { value: bigNumber17.mul(2) }
  )
  await waitForMint(tx.hash);
  console.log('add liquidity weth-tta success: ', tx.hash);

  // add liquidity weth-ttb 0.2:60
  tx = await routerIns.addLiquidityETH(
    ttb,
    bigNumber18.mul(60),
    0,
    0,
    wallet,
    deadLine,
    { value: bigNumber17.mul(2) }
  )
  await waitForMint(tx.hash);
  console.log('add liquidity weth-tta success: ', tx.hash);

  // add liquidity weth-usdt 0.2:60
  tx = await routerIns.addLiquidityETH(
    usdt,
    bigNumber18.mul(60),
    0,
    0,
    wallet,
    deadLine,
    { value: bigNumber17.mul(2) }
  )
  await waitForMint(tx.hash);
  console.log('add liquidity weth-usdt success: ', tx.hash);
  console.log(`============end to deploy ${name} dex============\n\n`);
}

async function deployDexBurgerswapV2(burgerswapV2Dex: any) {
  console.log(`============start to deploy ${burgerswapV2Dex.name} dex============`);
  let signer = ethers.provider.getSigner();
  let wallet = await signer.getAddress();

  let dgas: any;
  if (burgerswapV2Dex.dgas != '') {
    dgas = await ethers.getContractAt('DgasTest', burgerswapV2Dex.dgas);
  } else {
    let dgasFactory = await ethers.getContractFactory('DgasTest')
    dgas = await dgasFactory.deploy();
    await dgas.deployed();
  }
  console.log('deploy dgas success: ', dgas.address);

  let platform: any;
  if (burgerswapV2Dex.platform != '') {
    platform = await ethers.getContractAt('DemaxPlatform', burgerswapV2Dex.platform);
  } else {
    let platformFactory = await ethers.getContractFactory('DemaxPlatform');
    platform = await platformFactory.deploy();
    await platform.deployed();
  }
  console.log('deploy platform success: ', platform.address)

  let config: any
  if (burgerswapV2Dex.config != '') {
    config = await ethers.getContractAt('DemaxConfig', burgerswapV2Dex.config)
  } else {
    let configFactory = await ethers.getContractFactory('DemaxConfig')
    config = await configFactory.deploy()
    await config.deployed();
  }
  console.log('deploy config success: ', config.address)

  let transferListener: any
  if (burgerswapV2Dex.transferListener != '') {
    transferListener = await ethers.getContractAt('DemaxTransferListener', burgerswapV2Dex.transferListener);
  } else {
    let transferListenerFactory = await ethers.getContractFactory('DemaxTransferListener');
    transferListener = await transferListenerFactory.deploy();
    await transferListener.deployed();
  }
  console.log('deploy transferListener success: ', transferListener.address)

  let pool: any
  if (burgerswapV2Dex.pool != '') {
    pool = await ethers.getContractAt('DemaxPool', burgerswapV2Dex.pool);
  } else {
    let poolFactory = await ethers.getContractFactory('DemaxPool');
    pool = await poolFactory.deploy();
    await pool.deployed();
  }
  console.log('deploy pool success: ', pool.address)

  let factory: any
  if (burgerswapV2Dex.address != '') {
    factory = await ethers.getContractAt('DemaxFactory', burgerswapV2Dex.address);
  } else {
    let factoryFactory = await ethers.getContractFactory('DemaxFactory');
    factory = await factoryFactory.deploy(dgas.address, config.address);
    await factory.deployed();
  }
  console.log('deploy factory success: ', factory.address)

  // let governanace = config;
  // let tx = await transferListener.initialize(dgas.address, factory.address, weth, platform.address, wallet);
  // await waitForMint(tx.hash);
  // console.log('transferListener initialize success: ', tx.hash)

  // tx = await pool.initialize(dgas.address, weth, factory.address, platform.address, config.address, governanace.address);
  // await waitForMint(tx.hash);
  // console.log('pool initialize success: ', tx.hash)

  // tx = await platform.initialize(dgas.address, config.address, factory.address, weth, governanace.address, transferListener.address, pool.address);
  // await waitForMint(tx.hash);
  // console.log('platform initialize success: ', tx.hash)

  // tx = await config.initialize(dgas.address, governanace.address, platform.address, wallet, [weth, usdt]);
  // await waitForMint(tx.hash);
  // console.log('config initialize success: ', tx.hash)

  // tx = await dgas.upgradeImpl(transferListener.address)
  // await waitForMint(tx.hash);
  // console.log('dgas upgradeImpl success: ', tx.hash)


  // dgas approve to platform
  let tx = await dgas.approve(platform.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('dgas approve success: ', tx.hash);

  // usdt approve to platform
  let usdtIns = await ethers.getContractAt('TestERC20', usdt);
  tx = await usdtIns.approve(platform.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('usdt approve success: ', tx.hash);

  // tta approve to platform
  let ttaIns = await ethers.getContractAt('TestERC20', tta);
  tx = await ttaIns.approve(platform.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('tta approve success: ', tx.hash);

  // ttb approve to platform
  let ttbIns = await ethers.getContractAt('TestERC20', ttb);
  tx = await ttbIns.approve(platform.address, bigNumber18.mul('10000000000'));
  await waitForMint(tx.hash);
  console.log('ttb approve success: ', tx.hash);

  // add liquidity weth-dgas 0.2:2
  tx = await platform.addLiquidityETH(
    dgas.address,
    bigNumber18.mul(2),
    0,
    0,
    deadLine,
    { value: bigNumber17.mul(2) }
  )
  await waitForMint(tx.hash);
  console.log('add liquidity weth-dgas success: ', tx.hash);

  // add liquidity dgas-tta 1:10
  tx = await platform.addLiquidity(
    dgas.address,
    tta,
    bigNumber18.mul(1000).mul(burgerswapV2Dex.muls),
    bigNumber18.mul(1000).mul(10).mul(burgerswapV2Dex.muls),
    0,
    0,
    deadLine
  )
  console.log('add liquidity dgas-tta success: ', tx.hash);

  // add liquidity dgas-ttb 1:30
  tx = await platform.addLiquidity(
    dgas.address,
    ttb,
    bigNumber18.mul(1000).mul(burgerswapV2Dex.muls),
    bigNumber18.mul(1000).mul(30).mul(burgerswapV2Dex.muls),
    0,
    0,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity dgas-ttb success: ', tx.hash);

  // add liquidity tta-ttb 1:3
  tx = await platform.addLiquidity(
    tta,
    ttb,
    bigNumber18.mul(1000).mul(burgerswapV2Dex.muls),
    bigNumber18.mul(1000).mul(3).mul(burgerswapV2Dex.muls),
    0,
    0,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity tta-ttb success: ', tx.hash);

  // add liquidity dgas-usdt 1:30
  tx = await platform.addLiquidity(
    dgas.address,
    usdt,
    bigNumber18.mul(1000).mul(burgerswapV2Dex.muls),
    bigNumber18.mul(1000).mul(30).mul(burgerswapV2Dex.muls),
    0,
    0,
    deadLine
  )
  await waitForMint(tx.hash);
  console.log('add liquidity dgas-usdt success: ', tx.hash);

  console.log(`============end to deploy ${burgerswapV2Dex.name} dex============\n\n`);
}

async function deployDexWooFiswap(wooFiswapDex: any) {
  console.log(`============start to deploy ${wooFiswapDex.name} dex============`);
  let signer = ethers.provider.getSigner();
  let wallet = await signer.getAddress();

  let wethIns = await ethers.getContractAt('WETH9', weth);
  let usdtIns = await ethers.getContractAt('TestERC20', usdt);
  let ttaIns = await ethers.getContractAt('TestERC20', tta);
  let ttbIns = await ethers.getContractAt('TestERC20', ttb);

  // deploy && init wooGuardian
  let wooGuardian: any;
  if (wooFiswapDex.wooGuardian != '') {
    wooGuardian = await ethers.getContractAt('WooGuardian', wooFiswapDex.wooGuardian);
  } else {
    let wooGuardianFactory = await ethers.getContractFactory('WooGuardian')
    wooGuardian = await wooGuardianFactory.deploy(BigNumber.from(0));
    await wooGuardian.deployed();
  }
  console.log('deploy wooGuardian success: ', wooGuardian.address);

  // deploy && init wooracle
  let wooracle: any;
  if (wooFiswapDex.wooracle != '') {
    wooracle = await ethers.getContractAt('Wooracle', wooFiswapDex.wooracle);
  } else {
    let wooracleFactory = await ethers.getContractFactory('Wooracle');
    wooracle = await wooracleFactory.deploy();
    await wooracle.deployed();
    let tx = await wooracle.setQuoteToken(usdt);
    await waitForMint(tx.hash);
    console.log('wooracle setQuoteToken success: ', tx.hash);
    tx = await wooracle.postStateList(
      [
        weth,
        tta,
        ttb
      ],
      [
        bigNumber18.mul(300),
        bigNumber18.mul(3),
        bigNumber18.mul(1)
      ],
      [
        BigNumber.from('400000000000000'),
        BigNumber.from('6000000000000000'),
        BigNumber.from('6000000000000000')
      ],
      [
        BigNumber.from('5000000000'),
        BigNumber.from('500000000000'),
        BigNumber.from('500000000000')
      ]
    );
    await waitForMint(tx.hash);
    console.log('wooracle postStateList success: ', tx.hash);
  }
  console.log('deploy wooracle success: ', wooracle.address)

  // deploy && init wooPP
  const threshold = 0
  const lpFeeRate = 0
  const R = BigNumber.from(0)
  let wooPP: any
  if (wooFiswapDex.wooPP != '') {
    wooPP = await ethers.getContractAt('WooPP', wooFiswapDex.wooPP)
  } else {
    let wooPPFactory = await ethers.getContractFactory('WooPP')
    wooPP = await wooPPFactory.deploy(usdt, wooracle.address, wooGuardian.address)
    await wooPP.deployed();
    let tx = await wooPP.addBaseToken(weth, threshold, lpFeeRate, R)
    await waitForMint(tx.hash)
    console.log('wooPP addBaseToken weth success: ', tx.hash)
    tx = await wooPP.addBaseToken(tta, threshold, lpFeeRate, R)
    await waitForMint(tx.hash)
    console.log('wooPP addBaseToken tta success: ', tx.hash)
    tx = await wooPP.addBaseToken(ttb, threshold, lpFeeRate, R)
    await waitForMint(tx.hash)
    console.log('wooPP addBaseToken ttb success: ', tx.hash)
  }
  console.log('deploy wooPP success: ', wooPP.address)

  // deploy && init wooRouter
  let wooRouter: any
  if (wooFiswapDex.wooRouter != '') {
    wooRouter = await ethers.getContractAt('WooRouter', wooFiswapDex.wooRouter);
  } else {
    let wooRouterFactory = await ethers.getContractFactory('WooRouter');
    wooRouter = await wooRouterFactory.deploy(weth, wooPP.address);
    await wooRouter.deployed();
  }
  console.log('deploy wooRouter success: ', wooRouter.address);

  // add liquidity 
  let tx = await wethIns.deposit({ value: bigNumber18.mul(1) });
  await waitForMint(tx.hash);
  console.log('deposit weth success: ', tx.hash);
  tx = await wethIns.transfer(wooPP.address, bigNumber18.mul(1))
  await waitForMint(tx.hash);
  console.log('transfer weth to woopp success: ', tx.hash);
  tx = await ttaIns.transfer(wooPP.address, bigNumber18.mul(100000))
  await waitForMint(tx.hash);
  console.log('transfer tta to woopp success: ', tx.hash);
  tx = await ttbIns.transfer(wooPP.address, bigNumber18.mul(300000))
  await waitForMint(tx.hash);
  console.log('transfer ttb to woopp success: ', tx.hash);
  tx = await usdtIns.transfer(wooPP.address, bigNumber18.mul(700000))
  await waitForMint(tx.hash);
  console.log('transfer usdt to woopp success: ', tx.hash);

  console.log(`============end to deploy ${wooFiswapDex.name} dex============\n\n`);
}

async function main() {
  // deploy tokens 
  // await deployTokens();

  // deploy uniswapv2 dexs
  for (let i = 0; i < uniswapV2Dexs.length; i++) {
    if (uniswapV2Dexs[i].address == '') {
      await deployDexUniswapV2(uniswapV2Dexs[i].name, BigNumber.from(uniswapV2Dexs[i].muls));
    }
  }

  // deploy burgerswapv2 dexs
  // await deployDexBurgerswapV2(burgerswapV2Dexs[0])

  // deploy woofiswap dexs
  await deployDexWooFiswap(wooFiswapDexs[0])
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });