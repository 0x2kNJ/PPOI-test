import { deriveBIP44AddressKey } from '@metamask/key-tree';
import { BaseWallet, SigningKey, toBeHex, TypedDataEncoder } from 'ethers';
import { hashToFieldScalar } from './hash-to-field';
import type { PermitParams, State } from './types';
import { PERMIT_TYPES } from './types';

/**
 * Generates a new spend proxy account using the connected account's
 * mnemonic as entropy seed.
 *
 * The derivation path used is "m/44'/61'/764566'/1/$vendor":
 *
 * - purpose is BIP44
 * - coin type is 61 which is Ethereum Classic but 60 is blocked in Snaps
 * - account component is 0xbaa96 == 764566
 * - change component is 1 denoting 'internal chain'
 * - address index should be used to distinguish vendors
 * fx MetaMask could use index 0, 1inch index 1, ...
 *
 * "Internal chain is used for addresses which are not meant to be
 * visible outside of the wallet and is used for return transaction
 * change."
 * See https://en.bitcoin.it/wiki/BIP_0044
 *
 * @returns Spend proxy address
 */
export async function keygen(): Promise<string> {
  // `snap_getBip44Entropy` returns a `JsonBIP44CoinTypeNode` object, which can
  // be used with the `deriveBIP44AddressKey` function from `@metamask/key-tree`
  // to derive the private key for a BIP-44 address.
  const coinTypeNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: {
      coinType: 61,
      // Leaving the entropy source undefined will fallback to the primary
      // entropy source of given MetaMask instance.
      // See https://metamask.github.io/SIPs/SIPS/sip-30
      source: undefined,
    },
  });

  const hdNode = await deriveBIP44AddressKey(coinTypeNode, {
    account: 0xbaa96,
    change: 1,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    address_index: 0,
  });

  if (!hdNode.privateKey) {
    throw new Error('keygen failure');
  }

  const shieldedKeyPairSeed = hashToFieldScalar(hdNode.privateKey)

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {
        spendProxyPrivateKey: hdNode.privateKey,
        shieldedKeyPairSeed: toBeHex(shieldedKeyPairSeed, 32)
      },
      encrypted: true,
    },
  });

  const wallet = new BaseWallet(new SigningKey(hdNode.privateKey));

  return wallet.address;
}

/**
 * Gets the spend proxy address.
 *
 * @returns Spend proxy address
 */
export async function address(): Promise<string> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as null | State;

  if (!state?.spendProxyPrivateKey) {
    throw new Error('missing key');
  }

  const wallet = new BaseWallet(new SigningKey(state.spendProxyPrivateKey));

  return wallet.address;
}

/**
 * Signs given permit parameters with the spend proxy key.
 *
 * @param params Permit parameters incl. ERC-712 domain and ERC-2612 values
 * @returns Serialized permit signature
 */
export async function permit(params: PermitParams): Promise<string> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as null | State;

  if (!state?.spendProxyPrivateKey) {
    throw new Error('missing key');
  }

  const typedDataHash = TypedDataEncoder.hash(
    params.domain,
    PERMIT_TYPES,
    {
      ...params.values,
      value: BigInt(params.values.value),
      nonce: BigInt(params.values.nonce),
      deadline: BigInt(params.values.deadline),
    }
  );
  const signingKey = new SigningKey(state.spendProxyPrivateKey);
  const signature = signingKey.sign(typedDataHash);

  return signature.serialized;
}

export async function shieldedKeyPairSeed(): Promise<string> {
    const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as null | State;

  if (!state?.shieldedKeyPairSeed) {
    throw new Error('missing seed');
  }

  return state.shieldedKeyPairSeed
}