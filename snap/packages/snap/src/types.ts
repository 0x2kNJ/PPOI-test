/** The Snap's storage state. */
export type State = {
  spendProxyPrivateKey: undefined | string;
  shieldedKeyPairSeed: undefined | string;
};

/** RPC permit parameters. */
export type PermitParams = {
  domain: {
    name: string;
    version: string;
    chainId: string;
    verifyingContract: string;
  };
  values: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
  };
};

/** EIP-2616 Permit value types. */
export const PERMIT_TYPES = {
  Permit: [
    {
      name: 'owner',
      type: 'address',
    },
    {
      name: 'spender',
      type: 'address',
    },
    {
      name: 'value',
      type: 'uint256',
    },
    {
      name: 'nonce',
      type: 'uint256',
    },
    {
      name: 'deadline',
      type: 'uint256',
    },
  ],
};
