import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';

import { keygen, address, permit, shieldedKeyPairSeed } from './rpc';
import type { PermitParams } from './types';

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin: _origin,
  request,
}) => {
  switch (request.method) {
    case 'keygen':
      return await keygen();

    case 'address':
      return await address();

    case 'permit':
      return await permit(request.params as unknown as PermitParams);

    case 'shieldedKeyPairSeed':
      return await shieldedKeyPairSeed()

    default:
      throw new Error('Snap RPC method not found.');
  }
};
