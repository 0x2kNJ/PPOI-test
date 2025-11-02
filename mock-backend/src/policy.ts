import { Contract, JsonRpcProvider, Wallet } from 'ethers'

const POLICY_GATE_ABI = [
  'function check(address user, uint256 amount) view returns (bool ok, string reason)',
  'function consume(address user, uint256 amount)'
]

export class PolicyClient {
  private contract: Contract

  constructor(
    providerUrl: string,
    privateKey: string,
    policyAddress: string
  ) {
    const provider = new JsonRpcProvider(providerUrl)
    const signer = new Wallet(privateKey, provider)
    this.contract = new Contract(policyAddress, POLICY_GATE_ABI, signer)
  }

  async validate(user: string, amount: bigint): Promise<{ ok: boolean; reason: string }> {
    const [ok, reason] = await this.contract.check(user, amount)
    return { ok, reason }
  }

  async consume(user: string, amount: bigint): Promise<string> {
    const tx = await this.contract.consume(user, amount)
    return tx.hash as string
  }
}





