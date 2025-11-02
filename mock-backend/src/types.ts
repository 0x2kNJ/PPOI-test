export interface IPrecomputeProofArtifacts {
  args: IArgsPrecompute
  extData: IExtDataPrecompute
}

export interface IArgsPrecompute {
  proof: string
  publicInputs: string[]
  root: string
  inputNullifier: string
  publicAmount: string
  extDataHash: string
}

export interface IExtDataPrecompute {
  recipient: string
  token: string
  extAmount: string
}

export interface ISetPrecomputesRequest {
  buckets: {
    [bucketAmount: string]: IPrecomputeProofArtifacts[]
  }
  spendProxy: string
}

export interface IGetPrecomputesRequest {
  spendProxy: string
}

export interface IDeletePrecomputesRequest {
  spendProxy: string
  bucketNullifiers: {
    bucketAmount: string
    inputNullifier: string
  }[]
}

export interface IPaymentRequest {
  spendProxy: string
  token: string
  amount: string
}
