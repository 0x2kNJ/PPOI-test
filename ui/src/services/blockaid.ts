/**
 * Blockaid API Integration for Frontend
 * Provides real-time address scanning and compliance checking
 */

export interface BlockaidFeature {
  type: 'Malicious' | 'Warning' | 'Benign' | 'Info'
  feature_id: string
  description: string
}

export interface BlockaidScanResult {
  result_type: 'Malicious' | 'Warning' | 'Benign'
  address: string
  chain: string
  features: BlockaidFeature[]
  scan_time: number
}

export interface BlockaidComplianceCheck {
  passed: boolean
  riskScore: number
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  checks: {
    name: string
    status: 'PASS' | 'FAIL' | 'WARNING'
    description: string
  }[]
  recommendations: string[]
  timestamp: number
}

export class BlockaidService {
  private apiKey: string
  // Use proxy in development to avoid CORS issues
  private apiUrl = import.meta.env.DEV ? '/api/blockaid' : 'https://api.blockaid.io'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Scan an Ethereum address for security and compliance issues
   */
  async scanAddress(address: string, chain: string = 'ethereum'): Promise<BlockaidScanResult> {
    const startTime = Date.now()

    const response = await fetch(`${this.apiUrl}/v0/evm/address/scan`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: {
          source: 'web',
          origin: 'https://bermuda.app',
          account: address,
          connection: {
            type: 'wallet',
            name: 'bermuda',
            user_agent: navigator.userAgent,
          },
          domain: 'bermuda.app',
        },
        chain: chain,
        address: address.toLowerCase(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Blockaid API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const scanTime = Date.now() - startTime

    // Log all features returned by Blockaid for debugging
    if (data.features && data.features.length > 0) {
      console.log('[Blockaid] 📊 All features returned:', data.features.map((f: any) => ({
        type: f.type,
        feature_id: f.feature_id,
        description: f.description
      })))
    }

    return {
      result_type: data.result_type || 'Benign',
      address: data.address || address,
      chain: data.chain || chain,
      features: data.features || [],
      scan_time: scanTime,
    }
  }

  /**
   * Convert Blockaid scan result to a comprehensive compliance check
   */
  convertToComplianceCheck(scanResult: BlockaidScanResult): BlockaidComplianceCheck {
    const checks: BlockaidComplianceCheck['checks'] = []

    // Categorize features
    const maliciousFeatures = scanResult.features.filter(f => f.type === 'Malicious')
    const warningFeatures = scanResult.features.filter(f => f.type === 'Warning')
    const benignFeatures = scanResult.features.filter(f => f.type === 'Benign')
    const infoFeatures = scanResult.features.filter(f => f.type === 'Info')

    // Check if address has meaningful history data
    // If only benign/info features (no warnings, no malicious, no trust indicators), treat as unknown
    const hasMeaningfulData = benignFeatures.some(f => 
      ['VERIFIED_CONTRACT', 'TRUSTED_CONTRACT', 'TRUSTED_EOA'].includes(f.feature_id)
    ) || warningFeatures.some(f =>
      ['UNTRUSTED_EOA', 'UNTRUSTED_CONTRACT', 'NEW_ADDRESS', 'FRESH_ADDRESS'].includes(f.feature_id)
    ) || maliciousFeatures.length > 0
    
      const hasNoData = scanResult.features.length === 0 || !hasMeaningfulData
      console.log('[Blockaid] 🔍 Features found:', scanResult.features.length, '| hasNoData:', hasNoData, '| v2.2 (all checks shown)')
    if (scanResult.features.length > 0) {
      console.log('[Blockaid] 📋 Feature types:', {
        malicious: maliciousFeatures.length,
        warning: warningFeatures.length,
        benign: benignFeatures.length,
        info: infoFeatures.length
      })
    }

    // Critical security checks
    const ofacBanned = maliciousFeatures.some(f =>
      ['OFAC_BANNED_ADDRESS', 'SANCTIONS_LISTED'].includes(f.feature_id)
    )
    checks.push({
      name: 'OFAC Sanctions Check',
      status: ofacBanned ? 'FAIL' : 'PASS',
      description: ofacBanned
        ? '❌ Address is on OFAC sanctions list'
        : '✅ Address is not on OFAC sanctions list',
    })

    const knownMalicious = maliciousFeatures.some(f =>
      ['KNOWN_MALICIOUS', 'DRAINER_CONTRACT', 'MALICIOUS_CREATOR', 'MALICIOUS_INITIATOR', 'MALICIOUS_OPERATOR'].includes(f.feature_id)
    )
    checks.push({
      name: 'Malicious Activity Check',
      status: knownMalicious ? 'FAIL' : 'PASS',
      description: knownMalicious
        ? '❌ Address associated with known malicious activity'
        : '✅ No known malicious activity detected',
    })

    const maliciousToken = maliciousFeatures.some(f =>
      ['MALICIOUS_TOKEN'].includes(f.feature_id)
    )
    checks.push({
      name: 'Token Safety Check',
      status: maliciousToken ? 'FAIL' : 'PASS',
      description: maliciousToken
        ? '❌ Token associated with this address is known to be malicious'
        : '✅ No malicious tokens detected',
    })

    const phishing = maliciousFeatures.some(f =>
      ['ADDRESS_POISONING', 'POTENTIAL_PHISHING'].includes(f.feature_id)
    )
    checks.push({
      name: 'Phishing/Scam Check',
      status: phishing ? 'FAIL' : 'PASS',
      description: phishing
        ? '❌ Address associated with phishing or scams'
        : '✅ No phishing activity detected',
    })

    // Warning checks
    const untrusted = warningFeatures.some(f =>
      ['UNTRUSTED_EOA', 'UNTRUSTED_CONTRACT'].includes(f.feature_id)
    )
    const unverifiedContract = warningFeatures.some(f =>
      ['UNVERIFIED_CONTRACT'].includes(f.feature_id)
    )
    checks.push({
      name: 'Trust Level Check',
      status: hasNoData || untrusted ? 'WARNING' : 'PASS',
      description: hasNoData
        ? '⚠️ Address has no transaction history or data'
        : untrusted
        ? '⚠️ Address is not verified or trusted'
        : '✅ Address trust level acceptable',
    })

    const isContract = infoFeatures.some(f => f.feature_id === 'IS_CONTRACT')
    checks.push({
      name: 'Contract Verification Check',
      status: unverifiedContract ? 'WARNING' : isContract ? 'PASS' : 'INFO',
      description: unverifiedContract
        ? '⚠️ Contract is unverified on public explorers - source code not available'
        : isContract
        ? '✅ Contract is verified'
        : 'ℹ️ Not a contract address (EOA)',
    })

    const newAddress = warningFeatures.some(f =>
      ['NEW_ADDRESS', 'FRESH_ADDRESS'].includes(f.feature_id)
    )
    checks.push({
      name: 'Address Age Check',
      status: hasNoData || newAddress ? 'WARNING' : 'PASS',
      description: hasNoData
        ? '⚠️ No transaction history found'
        : newAddress
        ? '⚠️ Address is newly created (< 24 hours)'
        : '✅ Address has sufficient history',
    })

    // Positive checks
    const verified = benignFeatures.some(f =>
      ['VERIFIED_CONTRACT', 'TRUSTED_CONTRACT', 'TRUSTED_EOA', 'BENIGN_CREATOR'].includes(f.feature_id)
    )
    checks.push({
      name: 'Verification Status',
      status: verified ? 'PASS' : 'INFO',
      description: verified
        ? '✅ Address is verified or trusted'
        : 'ℹ️ Address verification status unknown',
    })

    // Calculate risk score
    let riskScore = 0
    let riskLevel: BlockaidComplianceCheck['riskLevel'] = 'LOW'

    if (ofacBanned || knownMalicious || maliciousToken) {
      riskScore = 100
      riskLevel = 'CRITICAL'
    } else if (phishing || maliciousFeatures.length > 0) {
      riskScore = 80
      riskLevel = 'HIGH'
    } else if (hasNoData) {
      // Address with no data should be treated as medium risk
      riskScore = 40
      riskLevel = 'MEDIUM'
    } else if (untrusted || unverifiedContract || warningFeatures.length > 1) {
      riskScore = 50
      riskLevel = 'MEDIUM'
    } else if (newAddress || warningFeatures.length > 0) {
      riskScore = 20
      riskLevel = 'LOW'
    } else if (verified) {
      riskScore = 0
      riskLevel = 'LOW'
    }

    // Build recommendations
    const recommendations: string[] = []
    if (ofacBanned) {
      recommendations.push('CRITICAL: This address is sanctioned. Transactions are prohibited.')
    }
    if (knownMalicious) {
      recommendations.push('Do not interact with this address. Known malicious activity detected.')
    }
    if (maliciousToken) {
      recommendations.push('CRITICAL: Token associated with this address is malicious. Do not interact.')
    }
    if (phishing) {
      recommendations.push('Exercise extreme caution. Possible phishing or scam address.')
    }
    if (hasNoData) {
      recommendations.push('Address has no transaction history or on-chain data. Verify legitimacy before proceeding.')
    }
    if (unverifiedContract) {
      recommendations.push('Contract is unverified. Review source code before interacting.')
    }
    if (untrusted) {
      recommendations.push('Address is unverified. Proceed with caution.')
    }
    if (newAddress) {
      recommendations.push('Newly created address. Verify legitimacy before large transactions.')
    }
    if (riskScore === 0 && verified) {
      recommendations.push('Address passes all compliance checks. Safe to proceed.')
    }

    const passed = scanResult.result_type === 'Benign' && riskScore < 60

    return {
      passed,
      riskScore,
      riskLevel,
      checks,
      recommendations: recommendations.length > 0 ? recommendations : ['No specific recommendations'],
      timestamp: Date.now(),
    }
  }

  /**
   * Perform a complete compliance scan
   */
  async checkCompliance(address: string, chain: string = 'ethereum'): Promise<BlockaidComplianceCheck> {
    const scanResult = await this.scanAddress(address, chain)
    return this.convertToComplianceCheck(scanResult)
  }
}

/**
 * Create a Blockaid service instance
 * If no API key is provided, returns null (for demo mode)
 */
export function createBlockaidService(apiKey?: string): BlockaidService | null {
  if (!apiKey || apiKey === 'your-blockaid-api-key-here') {
    console.warn('[Blockaid] No API key configured. Compliance checks will be simulated.')
    return null
  }
  return new BlockaidService(apiKey)
}

