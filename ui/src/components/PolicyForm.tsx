import { useState } from 'react'
import { parseUnits } from 'ethers'

type Props = {
  decimals: number
  onSubmit: (args: { maxTx: bigint; dailyLimit: bigint }) => Promise<void>
}

export default function PolicyForm({ decimals, onSubmit }: Props) {
  const [maxTx, setMaxTx] = useState('0')
  const [daily, setDaily] = useState('0')
  const [busy, setBusy] = useState(false)

  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit({
            maxTx: parseUnits(maxTx, decimals),
            dailyLimit: parseUnits(daily, decimals)
          })
        } finally {
          setBusy(false)
        }
      }}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}
    >
      <label style={{ display: 'flex', flexDirection: 'column' }}>
        <span>Max per-transaction</span>
        <input value={maxTx} onChange={e => setMaxTx(e.target.value)} placeholder="1.00" />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column' }}>
        <span>Daily limit</span>
        <input value={daily} onChange={e => setDaily(e.target.value)} placeholder="5.00" />
      </label>
      <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Set Policy'}</button>
    </form>
  )
}




