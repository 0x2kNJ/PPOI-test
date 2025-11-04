/**
 * Self Protocol Integration for Frontend
 * Provides privacy-preserving identity verification using government-issued IDs
 * Documentation: https://docs.self.xyz
 */

export interface SelfVerificationRequest {
  // Attributes to request from user's identity document
  requestedAttributes: ('age' | 'nationality' | 'humanity' | 'gender' | 'documentType')[]
  // Optional: Specific constraints (e.g., age >= 18, nationality in ['US', 'UK'])
  constraints?: {
    minAge?: number
    allowedNationalities?: string[]
    excludedNationalities?: string[]
  }
}

export interface SelfProofData {
  // ZK proof from Self Protocol
  proof: string
  // Public outputs (without revealing private data)
  publicSignals: {
    verified: boolean
    proofTimestamp: number
    attributesVerified: string[] // Which attributes were checked
  }
  // Optional revealed attributes (user consent required)
  revealedAttributes?: {
    ageRange?: string // e.g., "18-25", "25-35"
    nationalityRegion?: string // e.g., "EU", "NORTH_AMERICA"
    humanity?: boolean
  }
  // Desktop QR code support
  qrCode?: string // SelfApp JSON string (use with SelfQRcode component)
  deepLink?: string // Deep link URL
  requiresMobileScan?: boolean // True if desktop user needs to scan QR
}

export interface SelfComplianceCheck {
  passed: boolean
  verificationType: 'humanity' | 'age' | 'nationality' | 'full'
  checks: {
    name: string
    status: 'PASS' | 'FAIL' | 'INFO'
    description: string
  }[]
  proofData?: SelfProofData
  recommendations: string[]
  timestamp: number
}

export class SelfProtocolService {
  private apiUrl: string
  private sdkInitialized: boolean = false
  private sdk: any = null // Will be SelfSDK from @selfxyz/core

  constructor(apiUrl: string = 'https://api.self.xyz') {
    this.apiUrl = apiUrl
  }

  /**
   * Initialize Self Protocol SDK
   * 
   * NOTE: @selfxyz/core is a BACKEND verification SDK, not for frontend proof generation.
   * Frontend integration requires:
   * 1. User generates proof via Self Protocol mobile app
   * 2. Proof is received via deep link / callback
   * 3. Backend verifies proof using SelfBackendVerifier
   * 
   * For now, this is a placeholder for the proper integration.
   */
  private async initializeSdk(): Promise<void> {
    if (this.sdkInitialized) return

    try {
      // @selfxyz/core is for backend verification only
      // Actual frontend integration would use deep links to Self Protocol app
      console.log('[Self] ℹ️ Self Protocol uses mobile app for proof generation')
      console.log('[Self] Backend verification uses @selfxyz/core (SelfBackendVerifier)')
      this.sdkInitialized = true
    } catch (error) {
      throw new Error(
        'Failed to initialize Self Protocol integration. ' +
        'Error: ' + (error as Error).message
      )
    }
  }

  /**
   * Detect if user is on mobile device
   */
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  /**
   * Generate QR code using official Self Protocol SDK
   * 
   * This creates a QR code that the Self Protocol mobile app can properly scan and process.
   */
  async generateSelfQRCode(request: SelfVerificationRequest): Promise<string> {
    console.log('[Self] 🔧 Starting QR code generation...')
    console.log('[Self] Request:', JSON.stringify(request, null, 2))
    
    try {
      console.log('[Self] 1/4 Importing @selfxyz/qrcode...')
      const selfQRCodeModule = await import('@selfxyz/qrcode')
      console.log('[Self] ✓ Module imported. Available exports:', Object.keys(selfQRCodeModule))
      
      const { SelfAppBuilder } = selfQRCodeModule
      
      if (!SelfAppBuilder) {
        throw new Error('SelfAppBuilder not found in @selfxyz/qrcode exports')
      }
      
      console.log('[Self] ✓ SelfAppBuilder found')
      
      // Generate unique user session ID
      // Self Protocol requires either UUID or Ethereum address
      // Using a simple UUID v4 generator
      const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
      
      // Configure disclosures based on requested attributes
      const disclosures: any = {}
      
      request.requestedAttributes.forEach(attr => {
        switch (attr) {
          case 'humanity':
          case 'name':
            disclosures.name = true
            break
          case 'age':
            disclosures.minimumAge = request.constraints?.minAge || 18
            break
          case 'nationality':
            disclosures.nationality = true
            if (request.constraints?.excludedNationalities) {
              disclosures.excludedCountries = request.constraints.excludedNationalities
            }
            break
          case 'passport_number':
            disclosures.passport_number = true
            break
          case 'date_of_birth':
            disclosures.date_of_birth = true
            break
        }
      })
      
      // Always include OFAC check
      disclosures.ofac = true
      
      console.log('[Self] 2/4 Building Self Protocol app configuration...')
      
      // Self Protocol requires a publicly accessible endpoint (not localhost)
      // For development, we use a placeholder that will be replaced with ngrok/production URL
      // Vite uses import.meta.env, not process.env
      const endpoint = import.meta.env.VITE_SELF_CALLBACK_URL || 
                      'https://your-app.com/api/self-callback'
      
      console.log('[Self] Config:', {
        appName: 'Baanx PPOI',
        scope: 'baanx-ppoi',
        endpoint,
        userId,
        disclosures
      })
      
      if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        throw new Error(
          'Self Protocol requires a publicly accessible callback endpoint.\n' +
          'Localhost URLs are not allowed because mobile devices cannot reach them.\n\n' +
          'Options:\n' +
          '1. Use ngrok: ngrok http 4193\n' +
          '2. Set REACT_APP_SELF_CALLBACK_URL environment variable\n' +
          '3. Deploy to a public server\n\n' +
          'Example: REACT_APP_SELF_CALLBACK_URL=https://abc123.ngrok.io/api/self-callback'
        )
      }
      
      // Build the Self Protocol app configuration
      const builder = new SelfAppBuilder({
        appName: 'Baanx PPOI',
        scope: 'baanx-ppoi',
        endpoint,
        userId,
        disclosures,
      })
      
      console.log('[Self] ✓ Builder created, calling build()...')
      const selfApp = builder.build()
      console.log('[Self] ✓ Self app built')
      
      console.log('[Self] ✅ Self Protocol app configuration generated!')
      console.log('[Self] Ready to display QR code')
      
      // Return the selfApp object for the official SelfQRcode component
      return JSON.stringify(selfApp)
    } catch (error) {
      console.error('[Self] ❌ Error generating QR code:', error)
      console.error('[Self] Error stack:', (error as Error).stack)
      throw new Error(
        'Failed to generate Self Protocol QR code: ' +
        (error as Error).message
      )
    }
  }

  /**
   * Request identity verification from user
   * 
   * Desktop: Shows QR code to scan with mobile device
   * Mobile: Opens Self Protocol app directly via deep link
   */
  async requestVerification(
    request: SelfVerificationRequest
  ): Promise<SelfProofData> {
    await this.initializeSdk()

    console.log('[Self] 🆔 Requesting identity verification:', request)
    
    // Desktop: Generate QR code using official Self Protocol SDK
    console.log('[Self] 💻 Generating QR code using @selfxyz/qrcode')
    const qrCodeDataUrl = await this.generateSelfQRCode(request)
    console.log('[Self] ✅ QR code generated')
    
    // Store QR code for UI to display
    return {
      proof: '', // Will be filled after scan
      publicSignals: {
        verified: false,
        proofTimestamp: Date.now(),
        attributesVerified: request.requestedAttributes
      },
      revealedAttributes: {},
      qrCode: qrCodeDataUrl, // Pass QR code to UI
      requiresMobileScan: true
    } as any
  }

  /**
   * Verify a Self Protocol proof
   * 
   * NOTE: Proof verification should be done on the backend using SelfBackendVerifier
   * Frontend verification is not secure.
   * 
   * Proper flow:
   * 1. Frontend receives proof from Self Protocol app
   * 2. Frontend sends proof to backend
   * 3. Backend verifies using: new SelfBackendVerifier(...).verifyProof(proof)
   */
  async verifyProof(
    proofData: SelfProofData,
    requirements: SelfVerificationRequest
  ): Promise<boolean> {
    console.log('[Self] 🔍 Verifying Self Protocol proof...')
    console.log('[Self] ⚠️ Proof verification should be done on backend for security')

    // TODO: Send proof to backend for verification
    // Backend should use: SelfBackendVerifier from @selfxyz/core
    
    throw new Error(
      'Self Protocol proof verification must be done on backend.\n' +
      'Use SelfBackendVerifier from @selfxyz/core on your server.\n' +
      'See: https://docs.self.xyz'
    )
  }

  /**
   * Perform humanity check (sybil resistance)
   * Verifies user has a real government-issued ID
   */
  async checkHumanity(userIdentifier?: string): Promise<SelfComplianceCheck> {
    console.log('[Self] 👤 Checking humanity (sybil resistance)...')

    const request: SelfVerificationRequest = {
      requestedAttributes: ['humanity'],
      constraints: {}
    }

    try {
      const proofData = await this.requestVerification(request)
      const isValid = await this.verifyProof(proofData, request)

      const checks = [
        {
          name: 'Humanity Verification',
          status: (isValid && proofData.revealedAttributes?.humanity) ? 'PASS' : 'FAIL',
          description: (isValid && proofData.revealedAttributes?.humanity)
            ? '✅ User verified as real human with government-issued ID'
            : '❌ Could not verify humanity'
        },
        {
          name: 'Sybil Resistance',
          status: isValid ? 'PASS' : 'FAIL',
          description: isValid
            ? '✅ Unique identity verified (sybil attack prevented)'
            : '❌ Sybil resistance check failed'
        },
        {
          name: 'Document Authenticity',
          status: 'INFO' as const,
          description: 'ℹ️ Government-issued ID verified via NFC chip signature'
        }
      ]

      const recommendations = isValid
        ? ['User has valid government-issued ID. Sybil attack prevented.']
        : ['Could not verify identity. User may not have valid ID or declined verification.']

      return {
        passed: isValid,
        verificationType: 'humanity',
        checks,
        proofData: isValid ? proofData : undefined,
        recommendations,
        timestamp: Date.now()
      }
    } catch (error: any) {
      console.error('[Self] Humanity check error:', error)
      return {
        passed: false,
        verificationType: 'humanity',
        checks: [{
          name: 'Humanity Verification',
          status: 'FAIL',
          description: `❌ Verification failed: ${error.message}`
        }],
        recommendations: ['Identity verification failed. Please try again.'],
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check age requirement (e.g., 18+ for DeFi)
   */
  async checkAge(minAge: number): Promise<SelfComplianceCheck> {
    console.log(`[Self] 📅 Checking age requirement (${minAge}+)...`)

    const request: SelfVerificationRequest = {
      requestedAttributes: ['age'],
      constraints: { minAge }
    }

    try {
      const proofData = await this.requestVerification(request)
      const isValid = await this.verifyProof(proofData, request)

      const checks = [
        {
          name: `Age Verification (${minAge}+)`,
          status: isValid ? 'PASS' : 'FAIL',
          description: isValid
            ? `✅ User verified to be ${minAge}+ years old`
            : `❌ Could not verify age ${minAge}+`
        },
        {
          name: 'Age Range',
          status: 'INFO' as const,
          description: proofData.revealedAttributes?.ageRange
            ? `ℹ️ Age range: ${proofData.revealedAttributes.ageRange} (privacy-preserved)`
            : 'ℹ️ Exact age not revealed (privacy-preserved)'
        }
      ]

      const recommendations = isValid
        ? [`User meets age requirement (${minAge}+). Identity privacy maintained.`]
        : [`Could not verify user is ${minAge}+ years old.`]

      return {
        passed: isValid,
        verificationType: 'age',
        checks,
        proofData: isValid ? proofData : undefined,
        recommendations,
        timestamp: Date.now()
      }
    } catch (error: any) {
      console.error('[Self] Age check error:', error)
      return {
        passed: false,
        verificationType: 'age',
        checks: [{
          name: `Age Verification (${minAge}+)`,
          status: 'FAIL',
          description: `❌ Verification failed: ${error.message}`
        }],
        recommendations: ['Age verification failed. Please try again.'],
        timestamp: Date.now()
      }
    }
  }

  /**
   * Check nationality compliance (geographic restrictions)
   */
  async checkNationality(
    allowedCountries?: string[],
    excludedCountries?: string[]
  ): Promise<SelfComplianceCheck> {
    console.log('[Self] 🌍 Checking nationality compliance...')

    const request: SelfVerificationRequest = {
      requestedAttributes: ['nationality'],
      constraints: {
        allowedNationalities: allowedCountries,
        excludedNationalities: excludedCountries
      }
    }

    try {
      const proofData = await this.requestVerification(request)
      const isValid = await this.verifyProof(proofData, request)

      const checks = [
        {
          name: 'Nationality Verification',
          status: isValid ? 'PASS' : 'FAIL',
          description: isValid
            ? '✅ User nationality verified and meets requirements'
            : '❌ Could not verify nationality compliance'
        },
        {
          name: 'Geographic Compliance',
          status: 'INFO' as const,
          description: proofData.revealedAttributes?.nationalityRegion
            ? `ℹ️ Region: ${proofData.revealedAttributes.nationalityRegion} (exact country not revealed)`
            : 'ℹ️ Exact nationality not revealed (privacy-preserved)'
        }
      ]

      const recommendations = isValid
        ? ['User nationality meets geographic compliance requirements.']
        : ['Could not verify nationality compliance.']

      if (excludedCountries && excludedCountries.length > 0) {
        recommendations.push(`Excluded countries: ${excludedCountries.join(', ')}`)
      }
      if (allowedCountries && allowedCountries.length > 0) {
        recommendations.push(`Allowed countries: ${allowedCountries.join(', ')}`)
      }

      return {
        passed: isValid,
        verificationType: 'nationality',
        checks,
        proofData: isValid ? proofData : undefined,
        recommendations,
        timestamp: Date.now()
      }
    } catch (error: any) {
      console.error('[Self] Nationality check error:', error)
      return {
        passed: false,
        verificationType: 'nationality',
        checks: [{
          name: 'Nationality Verification',
          status: 'FAIL',
          description: `❌ Verification failed: ${error.message}`
        }],
        recommendations: ['Nationality verification failed. Please try again.'],
        timestamp: Date.now()
      }
    }
  }

  /**
   * Full compliance check (multiple attributes)
   */
  async checkCompliance(
    request: SelfVerificationRequest
  ): Promise<SelfComplianceCheck> {
    console.log('[Self] 🔐 Performing full Self Protocol compliance check...')

    try {
      const proofData = await this.requestVerification(request)
      const isValid = await this.verifyProof(proofData, request)

      const checks: SelfComplianceCheck['checks'] = []

      // Add check for each requested attribute
      if (request.requestedAttributes.includes('humanity')) {
        checks.push({
          name: 'Humanity Verification',
          status: isValid && proofData.revealedAttributes?.humanity ? 'PASS' : 'FAIL',
          description: isValid && proofData.revealedAttributes?.humanity
            ? '✅ Real human verified'
            : '❌ Humanity check failed'
        })
      }

      if (request.requestedAttributes.includes('age')) {
        checks.push({
          name: 'Age Verification',
          status: isValid ? 'PASS' : 'FAIL',
          description: isValid
            ? `✅ Age requirement met${request.constraints?.minAge ? ` (${request.constraints.minAge}+)` : ''}`
            : '❌ Age verification failed'
        })
      }

      if (request.requestedAttributes.includes('nationality')) {
        checks.push({
          name: 'Nationality Verification',
          status: isValid ? 'PASS' : 'FAIL',
          description: isValid
            ? '✅ Nationality verified'
            : '❌ Nationality verification failed'
        })
      }

      // Add privacy preservation info
      checks.push({
        name: 'Privacy Preservation',
        status: 'INFO',
        description: 'ℹ️ Identity verification via ZK proofs - full identity remains private'
      })

      const recommendations: string[] = []
      if (isValid) {
        recommendations.push('✅ All Self Protocol identity checks passed')
        recommendations.push('🔒 User identity verified while maintaining privacy')
      } else {
        recommendations.push('Identity verification incomplete or failed')
      }

      return {
        passed: isValid,
        verificationType: 'full',
        checks,
        proofData: isValid ? proofData : undefined,
        recommendations,
        timestamp: Date.now()
      }
    } catch (error: any) {
      console.error('[Self] Full compliance check error:', error)
      return {
        passed: false,
        verificationType: 'full',
        checks: [{
          name: 'Identity Verification',
          status: 'FAIL',
          description: `❌ Verification failed: ${error.message}`
        }],
        recommendations: ['Identity verification failed. Please try again.'],
        timestamp: Date.now()
      }
    }
  }
}

/**
 * Create a Self Protocol service instance
 * If no API endpoint provided, uses default production endpoint
 * 
 * IMPORTANT: Requires @selfxyz/core to be installed
 * Install with: npm install @selfxyz/core
 * 
 * Returns null if SDK is not available (allows build to succeed)
 */
export function createSelfService(apiUrl?: string): SelfProtocolService | null {
  console.log('[Self] Initializing Self Protocol service...')
  
  try {
    return new SelfProtocolService(apiUrl)
  } catch (error) {
    console.error('[Self] Failed to create service:', error)
    return null
  }
}

