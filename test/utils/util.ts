import { BigNumber } from 'ethers'

export const getDistribution = function (distribution: Array<BigNumber>, parts: number, times: number): any {
    if (parts != 10 && parts != 20) parts = 10
    let partsLeft = parts
    let res = new Array<number>(distribution.length)
    let allZero = true
    for (let i = 0; i < distribution.length; i++) {
        if (distribution[i].gt(0)) allZero = false
        let a = distribution[i].mul(parts).div(times).toNumber()
        let b = distribution[i].mul(parts).mod(times).gt(BigNumber.from(5).mul(times).div(10))
        if (b) a = a + 1
        if (i != distribution.length - 1) {
            partsLeft = partsLeft - a
        } else {
            a = partsLeft
        }
        res[i] = a
    }
    return allZero ? (new Array<number>(distribution.length)).fill(0) : res
}