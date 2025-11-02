import React, { useState, useEffect, useRef } from 'react'
import {
  Contract,
  formatEther,
  formatUnits,
  parseUnits,
  BrowserProvider,
  Wallet,
  Signature,
  JsonRpcProvider
} from 'ethers'
import bermuda from 'bermuda-bay-sdk'

declare global {
  interface Window {
    ethereum?: any;
  }
}

//NOTE will move all standalone helpers to lib.ts once everything is working

const USDC_DECIMALS = 6
const BLOCK_EXPLORER_URL = 'http://localhost:4194'
const JSON_RPC_URL = 'http://localhost:8545'

// Operator (withdraw) private key
const ANVIL_OPERATOR_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'

const sdk = bermuda('pull-poc')

let _provider

log('sdk.config', sdk.config)

const USDC = new Contract(
  sdk.config.mockUSDC!,
  [
    'function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) public',
    'function nonces(address owner) public view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function mint(address, uint256) external',
    'function decimals() view returns (uint8)'
  ],
  { provider: sdk.config.provider as any }
)

function log(...args) {
  console.log('baanx demo |', ...args)
}

function getProvider() {
  if (!_provider) _provider = new BrowserProvider((window as any).ethereum)
  return _provider
}

async function installSnap() {
    try {
        await window.ethereum.request({ method: 'wallet_requestSnaps', params: { "local:http://localhost:8080": {} } })
    } catch (err) {
      return alert('Please install MetaMask Flask!')
    }
}

async function invokeSnap({ method, params }: { method: string, params?: { [key:string]: any }}) {
    try {
      const output = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: "local:http://localhost:8080",
          request: params ? { method, params } : { method },
        },
      })
      return output ?? null
    } catch (err) {
      log('Snap invocation failed')
    }
}

async function getShieldedBalance(shieldedKeyPair, token) {
  token = token.toLowerCase()
  return sdk.utils
    .findUtxos({
      pool: sdk.config.pool,
      keypair: shieldedKeyPair,
      peers: [
        /*empty since we won't need to decrypt stx history, i.e. historical, spent UTXOs*/
      ],
      tokens: [token],
      excludeSpent: true,
      excludeOthers: true,
      from: sdk.config.startBlock
    })
    .then(found => sdk.utils.sumAmounts(found[token]))
    .then(async amount => formatUnits(amount, USDC_DECIMALS))
}

async function getBalance(nativeAddress, token) {
  if (token.toLowerCase() === sdk.config.mockUSDC?.toLowerCase()) {
    return USDC.balanceOf(nativeAddress).then(async balance =>
      formatUnits(balance, USDC_DECIMALS)
    )
  } else {
    return sdk.config.provider.getBalance(nativeAddress).then(formatEther)
  }
}

function Spinner() {
  // Source: https://cssloaders.github.io
  const spinnerStyles = {
    marginLeft: '5px',
    width: "10px",
    height: "10px",
    border: "2px solid #999",
    borderBottomColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    boxSizing: "border-box",
    animation: "rotation 1s linear infinite",
  };

  const rotationKeyFrames = `
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `

  return <>
    <style>{rotationKeyFrames}</style>
    <span style={spinnerStyles}></span>
  </>
}

function Tooltip({ body, children }: { body: string; children?: React.ReactNode }) {
  const [hover, setHover] = useState(false)

  const containerStyle = {
    position: 'relative',
    display: 'inline-block',
  };

  const tooltipStyle = {
    content: `'${body}'`,
    position: 'absolute',
    left: '110%',
    top: '50%',
    backgroundColor: '#fff',
    width: 'max-content',
    opacity: hover ? 1 : 0,
    transition: 'opacity 0.75s ease-in-out',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  };

  return <div
    style={containerStyle}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    >
      {children}
      <div style={tooltipStyle}>{body}</div>
  </div>
}

export default function App() {
  const [txInfos, setTxInfos] = useState([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [isLimiting, setIsLimiting] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isRebucketing, setIsRebucketing] = useState(false)
  const [userAddress, setUserAddress] = useState('0x')
  const [userUsdcBalance, setUserUsdcBalance] = useState('0')
  const [shieldedAddress, setShieldedAddress] = useState('0x')
  const [shieldedBalance, setShieldedBalance] = useState('0')
  const [spendProxyAddress, setSpendProxyAddress] = useState('0x')
  const [spendProxyBalance, setSpendProxyBalance] = useState('0')
  const [beneficiaryBalance, setBeneficiaryBalance] = useState('0')
  const [fundingAmount, setFundingAmount] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [shieldedKeyPairSeed, setShieldedKeyPairSeed] = useState(null)
  const [spendingLimit, setSpendingLimit] = useState("0")
  const [timing, setTiming] = useState(false)
  const [payStartBlock, setPayStartBlock] = useState(null)
  const [payEndBlock, setPayEndBlock] = useState(null)
  const [showTopupPopup, setShowTopupPopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState('0')
  const [intervalActive, setIntervalActive] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpendingLimitRef = useRef('0')
  const [timers, setTimers] = useState({})

  function handleTimerStart(event) {
    const { id, title } = event.detail

    setTimers(oldState => ({
      ...oldState,
      [id]: {
        title,
        start: performance.now()
      }
    }))
  }

  function handleTimerStop(event) {
    const { id } = event.detail

    setTimers(oldState => {
      const results = Object.keys(oldState)
        .find((key) => key === id)

      if (!results?.length) {
        return oldState
      }

      const existingValues = oldState[id]

      // Check if the timer was already stopped.
      if (existingValues.end) {
        log(`Timer with id "${id}" already stopped...`)
        return oldState
      }

      return {
        ...oldState,
        [id]: {
          ...existingValues,
          end: performance.now()
        }

      }
    })
  }

  useEffect(() => {
    window.addEventListener('timer:start', handleTimerStart)
    window.addEventListener('timer:stop', handleTimerStop)

    return () => {
      window.removeEventListener('timer:start', handleTimerStart)
      window.removeEventListener('timer:stop', handleTimerStop)
    }
  }, [])


  useEffect(() => {
    if (isMinting || isFunding || isLimiting || isPaying) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
    }
  }, [isMinting, isFunding, isLimiting, isPaying])

  useEffect(() => {
    const checkTopupNeeded = async () => {
      if (!shieldedKeyPairSeed || !spendingLimit || spendingLimit === '0') {
        return
      }
      const spendingLimitNum = Number(formatUnits(spendingLimit, USDC_DECIMALS))
      const cardBalanceNum = Number(shieldedBalance)
      const userBalanceNum = Number(userUsdcBalance)

      if (spendingLimitNum - cardBalanceNum > 0 && userBalanceNum > 0) {
        const diff = spendingLimitNum - cardBalanceNum
        const maxFundAmount = Math.min(diff, userBalanceNum)

        setTopupAmount(maxFundAmount.toString())
        setShowTopupPopup(true)
        setIntervalActive(false)
      }
    }

    if (spendingLimit !== '0' && spendingLimit !== lastSpendingLimitRef.current && !showTopupPopup) {
      setIntervalActive(true)
      lastSpendingLimitRef.current = spendingLimit
    }

    if (intervalActive && !showTopupPopup) {
      intervalRef.current = setInterval(checkTopupNeeded, 60000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [spendingLimit, shieldedBalance, userUsdcBalance, shieldedKeyPairSeed, showTopupPopup, intervalActive])

  useEffect(() => {
    if (payStartBlock && payEndBlock && (payStartBlock < payEndBlock)) {
      setIsRebucketing(true)

      const rebucket = async () => {
        const shieldedKeyPair = new sdk.types.KeyPair(shieldedKeyPairSeed)

        const result = await sdk.baanx.rebucket({
          token: sdk.config.mockUSDC!.toLowerCase(),
          fromBlock: BigInt(payStartBlock),
          toBlock: BigInt(payEndBlock),
          shieldedKeyPair,
          spendProxyAddress: spendProxyAddress.toLowerCase()
        })

        if (result) {
          const { rebucketTxHash, reserveTxHash } = result

          setTxInfos(oldState => [
            ...oldState,
            {
              hash: rebucketTxHash,
              title: 'Rebucketing',
              description: 'Maintenance operation to ensure that used precomputes and UTXOs are regenerated'
            }
          ])
          setTxInfos(oldState => [
            ...oldState,
            {
              hash: reserveTxHash,
              title: 'UTXO Reservations',
              description: 'UTXO reservations transaction so that UTXOs can be used for unshielding'
            }
          ])

          setShieldedBalance(await getShieldedBalance(shieldedKeyPair, sdk.config.mockUSDC))
          setSpendProxyBalance(await getBalance(spendProxyAddress, sdk.config.mockUSDC))
        }
      }

      rebucket()
        .finally(() => {
          setPayStartBlock(null)
          setPayEndBlock(null)
          setIsRebucketing(false)
        })
    }
  }, [payStartBlock, payEndBlock])

  async function handleConnect() {
    setIsConnecting(true)

    try {
      log("Installing Snap...")
      await installSnap()

      const provider = getProvider()
      await provider.send('eth_requestAccounts', [])
      const user = await provider.getSigner()
      const userAddress = await user.getAddress()

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: "0x7a69", // 31337
            chainName: "anvil",
            rpcUrls: ['http://localhost:8545'],
            iconUrls: [],
            nativeCurrency: {
              name: "MockEther",
              symbol: "GO",
              decimals: 18
            },
            blockExplorerUrls: [BLOCK_EXPLORER_URL]
          }
        ]
      })

      log("Keygen...")
      const { shieldedKeyPairSeed, shieldedAddress, spendProxyAddress } = await keygen()
      const shieldedKeyPair = new sdk.types.KeyPair(shieldedKeyPairSeed)
      log("spendProxyAddress", spendProxyAddress)
      log("shieldedAddress", shieldedKeyPair.address())

      log("Airdropping 10,000 USDC...")
      const mintAmount = parseUnits('10000', USDC_DECIMALS)
      const mintPayload = USDC.interface.encodeFunctionData("mint", [userAddress, mintAmount])
      const tx = await sdk.utils.relay(sdk.config.relayer!, { chainId: sdk.config.chainId, target: await USDC.getAddress(), data: mintPayload })
      await sdk.config.provider.waitForTransaction(tx, 1)

      setUserUsdcBalance(await getBalance(userAddress, sdk.config.mockUSDC))
      setShieldedKeyPairSeed(shieldedKeyPairSeed)
      setUserAddress(userAddress)
      setUserUsdcBalance(await getBalance(userAddress, sdk.config.mockUSDC))
      setShieldedAddress(shieldedAddress)
      setShieldedBalance(await getShieldedBalance(shieldedKeyPair, sdk.config.mockUSDC))
      setSpendProxyAddress(spendProxyAddress)
      setSpendProxyBalance(await getBalance(spendProxyAddress, sdk.config.mockUSDC))

      setBeneficiaryBalance(await getBalance(sdk.config.beneficiary, sdk.config.mockUSDC))
    } finally {
      setIsConnecting(false)
    }
  }

  async function fundShieldedAccount(amount: string, isTopup: boolean = false) {
    setIsFunding(true)

    try {
      log(isTopup ? 'handleTopup()' : 'handleFund()')
      const parsedAmount = parseUnits(amount, USDC_DECIMALS)

      const provider = getProvider()
      const user = await provider.getSigner()

      let lastShieldedBalance = 0
      sdk.config.pool.on("NewCommitment", async () => {
        const shieldedKeyPair = sdk.types.KeyPair.fromSeed(shieldedKeyPairSeed)
        const shieldedBalance = await getShieldedBalance(shieldedKeyPair, sdk.config.mockUSDC)
        if (Number(shieldedBalance) > lastShieldedBalance) {
          setShieldedBalance(shieldedBalance)
          setUserUsdcBalance(await getBalance(userAddress, sdk.config.mockUSDC))
          lastShieldedBalance = Number(shieldedBalance)
        }
      })

      log(isTopup ? "Funding shielded account via topup..." : "Funding shielded account...")
      // Funds a shielded account, generates precomputes, then stores them in the MetaMask backend.
      const txs = await sdk.baanx.fund({
        signer: user,
        shieldedKeyPair: new sdk.types.KeyPair(shieldedKeyPairSeed),
        spendProxyAddress,
        token: sdk.config.mockUSDC!.toLowerCase(),
        amount: parsedAmount
      })

      log(isTopup ? "Updating balances after topup..." : "Updating balances...")
      const shieldedKeyPair = new sdk.types.KeyPair(shieldedKeyPairSeed)
      setShieldedBalance(await getShieldedBalance(shieldedKeyPair, sdk.config.mockUSDC))
      setUserUsdcBalance(await getBalance(userAddress, sdk.config.mockUSDC))

      setTxInfos(oldState => [
        ...oldState,
        {
          hash: txs.fundingTxHash,
          title: `Funding`,
          description: 'Pool funding transaction'
        },
        {
          hash: txs.reserveTxHash,
          title: 'UTXO Reservations',
          description: 'UTXO reservations transaction so that UTXOs can be used for unshielding'
        },
      ])
    } finally {
      setIsFunding(false)
    }
  }

  async function handleFund(event) {
    event.preventDefault()
    return fundShieldedAccount(String(fundingAmount))
  }

  async function handlePay(event) {
    event.preventDefault()

    setIsPaying(true)
    setPayStartBlock(await sdk.config.provider.getBlockNumber())

    try {
      const amount = parseUnits(paymentAmount, USDC_DECIMALS)
      // This is the critical notification that a card backend would need to
      // receive from Baanx right at the time of payment at a POS.
      const response = await fetch(`${sdk.config.mockBackend}/pay`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spendProxy: spendProxyAddress.toLowerCase(),
          token: sdk.config.mockUSDC!.toLowerCase(),
          amount: sdk.utils.hex(amount)
        })
      })
      const { precomputeBatchTxHashes } = await response.json()
      const txHashes: string[] = precomputeBatchTxHashes ?? []

      // Start precompute redemption timer.
      window.dispatchEvent(new CustomEvent('timer:start', {
        detail: {
          id: 'payment',
          title: 'On-chain operations of card payment'
        }
      }))

      // Append all payment-related txs to the UI list.
      setTxInfos(oldState => [
        ...oldState,
        ...txHashes.map((hash: string, idx: number) => ({
          hash,
          title: txHashes.length > 1 ? `Payment #${idx + 1}` : 'Payment',
          description: 'Payment transaction which unshields the payment amount onto the spending address'
        }))
      ])

      // Wait for the last transaction to be included on-chain.
      // Need to use a provider created via ethers here as otherwise the user
      // would need to have MetaMask open.
      const provider = new JsonRpcProvider(JSON_RPC_URL)
      const lastHash = txHashes.at(-1)
      if (lastHash) {
        await provider.waitForTransaction(lastHash, 0, 150_000)
      }

      try {
        if (!ANVIL_OPERATOR_PRIVATE_KEY) {
          log('Operator private key missing.')
          return
        }
        log('Withdrawing via FoxConnectUS as operator...')
        const operator = new Wallet(ANVIL_OPERATOR_PRIVATE_KEY, sdk.config.provider as any)
        const fox = new Contract(
          sdk.config.foxConnectUS!,
          [
            'function withdraw(address[] tokens, address[] sources, uint256[] amounts) public'
          ],
          operator as any
        )
        const tx = await fox['withdraw'](
          [sdk.config.mockUSDC!.toLowerCase()],
          [spendProxyAddress.toLowerCase()],
          [amount]
        )
        log('Withdraw tx', tx.hash)

        // Stop precompute redemption timer.
        window.dispatchEvent(new CustomEvent('timer:stop', { detail: { id: 'payment' } }))

        log('Updating balances...')
        const shieldedKeyPair = new sdk.types.KeyPair(shieldedKeyPairSeed)
        setShieldedBalance(await getShieldedBalance(shieldedKeyPair, sdk.config.mockUSDC))
        setUserUsdcBalance(await getBalance(userAddress, sdk.config.mockUSDC))
        setSpendProxyBalance(await getBalance(spendProxyAddress, sdk.config.mockUSDC))
        setBeneficiaryBalance(await getBalance(sdk.config.beneficiary, sdk.config.mockUSDC))

        setTxInfos(oldState => [
          ...oldState,
          {
            hash: tx.hash,
            title: 'Withdrawal',
            description: 'Withdrawal from Proxy EOA via FoxConnectUS'
          }
        ])
      } catch (err) {
        log('Withdraw failed', err)
      }
    } finally {
      setIsPaying(false)
      setPayEndBlock(await sdk.config.provider.getBlockNumber())
      // Stop precompute redemption timer (this is a noop if it was already stopped).
      window.dispatchEvent(new CustomEvent('timer:stop', { detail: { id: 'payment' } }))
    }
  }

  async function handleSpendingLimit(event) {
    event.preventDefault()

    setIsLimiting(true)

    try {
      const amount = parseUnits(formatUnits(spendingLimit, USDC_DECIMALS), USDC_DECIMALS)

      log("Signing spending limit permit in Snap")
      const owner = spendProxyAddress
      const spender = sdk.config.foxConnectUS
      const deadline = sdk.utils.hex(Math.ceil(Date.now() / 1000 + 60 * 60 * 24 * 365))
      const permitSig = await invokeSnap({
        method: 'permit',
        params: {
          domain: {
            name: 'MockUSDC',
            version: '1',
            chainId: '0x7a69',
            verifyingContract: sdk.config.mockUSDC!.toLowerCase()
          },
          values: {
            owner,
            spender,
            value: sdk.utils.hex(amount),
            nonce: sdk.utils.hex(await USDC.nonces(owner)),
            deadline
          }
        }
      }).then(sig => Signature.from(sig as string))

      const permitData = USDC.interface.encodeFunctionData('permit', [
        owner,
        spender,
        amount,
        deadline,
        permitSig.v,
        permitSig.r,
        permitSig.s
      ])

      log("Relaying permit sig...")
      const permitTx = await sdk.utils.relay(sdk.config.relayer!, {
        chainId: sdk.config.chainId,
        target: sdk.config.mockUSDC!,
        data: permitData
      })
      log("Permit tx", permitTx)

      setSpendingLimit(sdk.utils.hex(amount))

      setTxInfos(oldState => [
        ...oldState,
        {
          hash: permitTx,
          title: 'Spending Limit Permit',
          description: 'Spending limit permit transaction to increase / decrease allowed withdrawal amounts'
        }
      ])
    } finally {
      setIsLimiting(false)
    }
  }

  async function handleTopup(confirmed: boolean) {
    setShowTopupPopup(false)

    if (!confirmed) {
      return
    }

    return fundShieldedAccount(topupAmount, true)
  }

  async function handleSpendingLimitChange(e) {
    if (/^\d+$/.test(e.target.value)) {
      setSpendingLimit(sdk.utils.hex(parseUnits(e.target.value, USDC_DECIMALS)))
    }
  }

  async function keygen() {
    const spendProxyAddress = await invokeSnap({ method: 'keygen' }).then(adrs => adrs as string)
    const shieldedKeyPairSeed = await invokeSnap({ method: 'shieldedKeyPairSeed' }).then(seed => BigInt(seed))
    const shieldedKeyPair = new sdk.types.KeyPair(shieldedKeyPairSeed)
    const shieldedAddress = shieldedKeyPair.address()
    return {
      shieldedAddress,
      spendProxyAddress,
      shieldedKeyPairSeed
    }
  }

  return (
    <div>
      <h1>Private Debit Card Demo</h1>

      {/* <div>
        This demo illustrates a non-custodial privacy layer on top of MetaMask's existing debit card
        implementation, specifically the process of:

        <ul>
          <li>
            Funding a shielded account and accrediting shielded funds to the debit card
          </li>
          <li>
            Setting the card spending limit via permit signatures of an unlinkable spending address through which payments are routed to Baanx
          </li>
          <li>
            Precomputing withdrawal ZK proofs that enable real-time payments being initiated from the merchant terminal (withdrawal executes within ~20ms)
          </li>
          <li>
            Gasless payments through permit signatures and sponsored relayers or ERC-4337 paymasters
          </li>
        </ul>

        This architecture is compatible with MetaMask's existing product design and UX, while providing
        an added layer of privacy for users. Spend proxy and shielded key generation are handled in a Snap, nonetheless
        the solution can be further extended to support:

        <ul>
          <li>
            A rewards hook to support existing rewards programs
          </li>
          <li>
            Smart account implementation
          </li>
          <li>
            A bridge hook to support cross-chain funding of the private account
          </li>
        </ul>
      </div> */}

      <div className="black-box">
        <h3>
          {userAddress === '0x' ? (
            <button disabled={isConnecting} onClick={handleConnect}>
              Connect
              {isConnecting && <Spinner />}
            </button>
          ) : (
            'Connect'
          )}
          ed Account{' '}
        </h3>
        <div>Address: {userAddress || '0x'}</div>
        <div>
          Balance: {userUsdcBalance ?? '?'} USDC
        </div>
      </div>

      <div className="black-box">
        <h3>Shielded Card</h3>
        <div>Balance: {shieldedBalance} USDC</div>

        <form onSubmit={handleFund} title="Fund your shielded card" style={{margin: "1.25rem 0 0 0"}}>
          <button type="submit" disabled={
            isLoading ||
            isRebucketing ||
            !Number(userUsdcBalance) ||
            fundingAmount <= 0
          }>
            Fund Private Account
            {isFunding && <Spinner />}
          </button>
          <input
            name="amount"
            type="number"
            min="0"
            value={fundingAmount}
            onChange={(e) => e.target.value && setFundingAmount(e.target.value)}
          /> USDC
        </form>

        <form onSubmit={handleSpendingLimit} title="Set a spending limit" style={{margin: "1.25rem 0 0 0"}}>
          <button type="submit" disabled={
            isLoading ||
            isRebucketing ||
            !Number(shieldedBalance) ||
            Number(formatUnits(spendingLimit, 6)) <= 0
          }>
            Card Spending Limit
            {isLimiting && <Spinner />}
          </button>
          <input
            name="amount"
            type="number"
            min="0"
            value={Number(formatUnits(spendingLimit, USDC_DECIMALS))}
            onChange={handleSpendingLimitChange}
          /> USDC
        </form>

        <form onSubmit={handlePay} title="Simulate a payment"  style={{margin: "1.25rem 0 0 0"}}>
          <button type="submit" disabled={
            isLoading ||
            isRebucketing ||
            !(Number(shieldedBalance) && Number(spendingLimit)) ||
            paymentAmount <= 0
          }>
            {!isRebucketing ? 'Simulate Card Payment' : 'Rebucketing'}
            {(isPaying || isRebucketing) && <Spinner />}
          </button>
          <input
            name="amount"
            type="number"
            min="0"
            value={paymentAmount}
            onChange={(e) => e.target.value && setPaymentAmount(e.target.value)}
          /> USDC
        </form>
      </div>

      <div
        className="black-box"
        title="The timer measures the payment phase from when a payment request is known by the wallet backend until the withdrawal onto the spend proxy is settled, i.e. in-block, zero confirmations."
      >
        <h3>Timer</h3>
        {Object.entries(timers).length ? (
          <ul>
            {Object.entries(timers).map(([key, value]) =>
              <li key={key}>
                <>{(value as any).title} {(value as any).end ? 'took ' + ((value as any).end - (value as any).start).toFixed(2) + 'ms' : 'timer is running...' }</>
              </li>
            )}
          </ul>
        ) : (
          <div></div>
        )}
      </div>

      <div className="black-box">
        <h3>Transactions</h3>
        {txInfos.length ? (
          <ul>
            {txInfos.map(({ hash, title, description }) =>
              <li key={hash}>
                <Tooltip body={description}>
                  <a href={new URL(`tx/${hash}`, BLOCK_EXPLORER_URL)} target="_blank">{title}</a>
                </Tooltip>
              </li>
            )}
          </ul>
        ) : (
          <div></div>
        )}
      </div>
      {showTopupPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3>Top up shielded card balance to your spending limit?</h3>
            <div style={{ margin: '15px 0' }}>
              <div>Spending Limit: {formatUnits(spendingLimit, USDC_DECIMALS)} USDC</div>
              <div>Card Balance: {shieldedBalance} USDC</div>
              <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                Fund Amount: {topupAmount} USDC
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleTopup(true)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Yes
                {isFunding && <Spinner />}
              </button>
              <button
                onClick={() => handleTopup(false)}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      <details>
        <div className="black-box">
          <div style={{ wordBreak: 'break-word' }}>
            Connected Account's Shielded Address: {shieldedAddress || '0x'}
          </div>
          <hr />
          <div>Spend Proxy Address: {spendProxyAddress || '0x'}</div>
          <div>Spend Proxy Balance: {spendProxyBalance ?? '?'} USDC</div>
          <hr />
          <div>FoxConnectUS Address: {sdk.config.foxConnectUS}</div>
          <div>Operator Address: {sdk.config.operator}</div>
          <hr />
          <div>Beneficiary Address: {sdk.config.beneficiary}</div>
          <div>Beneficiary Balance: {beneficiaryBalance ?? '?'} USDC</div>
        </div>
      </details>
    </div>
  )
}
