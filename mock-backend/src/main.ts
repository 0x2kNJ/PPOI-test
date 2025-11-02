import Fastify from 'fastify'
import cors from '@fastify/cors'
import bermuda from 'bermuda-bay-sdk'
import db from './db.js'
import {
  IPaymentRequest,
  IPrecomputeProofArtifacts,
  ISetPrecomputesRequest,
  IGetPrecomputesRequest,
  IDeletePrecomputesRequest
} from './types'

const sdkOptions: any = {}
if (process.env.RELAYER) sdkOptions.relayer = process.env.RELAYER
if (process.env.RPC_URL) sdkOptions.provider = process.env.RPC_URL
const sdk = bermuda('pull-poc', sdkOptions)

const fastify = Fastify({ logger: true })
await fastify.register(cors, {
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'HEAD', 'POST', 'DELETE']
})

fastify.post('/pay', async (req, res) => {
  let { spendProxy, token, amount } = req.body as IPaymentRequest
  spendProxy = spendProxy.toLowerCase()
  const available = db.getAvailablePrecomputesCount(spendProxy)
  const storage = db.getPrecomputes(spendProxy)
  const result = await sdk.baanx.withdraw({
    spendProxy,
    token,
    amount: BigInt(amount),
    available,
    db: storage
  })
  res.code(202)
  res.send({
    precomputeBatchTxHashes: result.precomputeBatchTxHashes
  })
})

fastify.post('/precomputes', async (req, res) => {
  const { spendProxy, buckets } = req.body as ISetPrecomputesRequest
  db.storePrecomputes(spendProxy.toLowerCase(), buckets)
  res.code(201)
})

fastify.delete('/precomputes', async (req, res) => {
  const { spendProxy, bucketNullifiers } = req.body as IDeletePrecomputesRequest
  db.deletePrecomputes(spendProxy.toLowerCase(), bucketNullifiers)
  res.code(204)
})

fastify.get('/precomputes', async (req, res) => {
  const { spendProxy } = req.query as IGetPrecomputesRequest
  const precomputes = db.getPrecomputes(spendProxy.toLowerCase()) ?? new Map()
  const precomputesObject: { [key: string]: IPrecomputeProofArtifacts[] } = {}
  for (const [bucketAmount, artifacts] of precomputes.entries()) {
    precomputesObject[String(bucketAmount)] = artifacts
  }
  res.code(200).type('application/json').send(precomputesObject)
})

fastify.get('/status', (_, res) => res.code(200).type('application/json').send({ status: 'ok' }))

fastify.listen({ host: '0.0.0.0', port: Number(process.env.PORT) })
