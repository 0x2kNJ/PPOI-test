import { IPrecomputeProofArtifacts } from './types.js'

const precomputes = new Map<string, Map<number, IPrecomputeProofArtifacts[]>>()

export const storage = {
  storePrecomputes(
    spendProxy: string,
    buckets: { [bucketAmount: string]: IPrecomputeProofArtifacts[] }
  ) {
    const oldPrecomputes = precomputes.get(spendProxy) || new Map()
    const newPrecomputes = new Map(oldPrecomputes)

    for (const [bucketAmount, newArtifacts] of Object.entries(buckets)) {
      const bucketAmountNum = parseInt(bucketAmount)
      if (oldPrecomputes.has(bucketAmountNum)) {
        const oldArtifacts = oldPrecomputes.get(bucketAmountNum)!
        newPrecomputes.set(bucketAmountNum, [...oldArtifacts, ...newArtifacts])
      } else {
        newPrecomputes.set(bucketAmountNum, [...newArtifacts])
      }
    }

    precomputes.set(spendProxy, newPrecomputes)
  },

  getPrecomputes(spendProxy: string): Map<number, IPrecomputeProofArtifacts[]> | undefined {
    return precomputes.get(spendProxy)
  },

  deletePrecomputes(
    spendProxy: string,
    bucketNullifiers: { bucketAmount: string; inputNullifier: string }[]
  ) {
    const oldPrecomputes = precomputes.get(spendProxy)
    const newPrecomputes = new Map(oldPrecomputes)

    if (oldPrecomputes) {
      for (const { bucketAmount, inputNullifier } of bucketNullifiers) {
        const bucketAmountNum = parseInt(bucketAmount)

        if (newPrecomputes.has(bucketAmountNum)) {
          const oldArtifacts = newPrecomputes.get(bucketAmountNum)!
          const newArtifacts = oldArtifacts.filter(e => e.args.inputNullifier !== inputNullifier)

          if (newArtifacts.length) {
            newPrecomputes.set(bucketAmountNum, newArtifacts)
          } else {
            newPrecomputes.delete(bucketAmountNum)
          }
        }
      }
    }

    precomputes.set(spendProxy, newPrecomputes)
  },

  getAvailablePrecomputesCount(spendProxy: string): Map<number, number> | undefined {
    const available = new Map<number, number>()
    const precomputes = this.getPrecomputes(spendProxy)
    if (!precomputes) {
      return undefined
    }
    for (const [bucketAmount, artifacts] of precomputes.entries()) {
      available.set(bucketAmount, artifacts.length)
    }
    return available
  }
}

export default storage
