import {
  getBatchMerkleProofFetcher,
  getClaimableUtxoScannerFunction,
  getComplianceGrantIssuerFunction,
  getComplianceGrantRevokerFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getMasterViewingKeyX25519KeypairDeriver,
  getPollingTransactionForwarder,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getSharedCiphertextReencryptorForUserGrantFunction,
  getUmbraClient,
  getUmbraRelayer,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  assertOptionalData32,
} from "@umbra-privacy/sdk";
import type {
  IUmbraSigner,
  TransactionCallbacks,
  UserRegistrationOptions,
} from "@umbra-privacy/sdk/interfaces";
import type {
  OptionalData32,
  RcEncryptionNonce,
  U32,
  U64,
} from "@umbra-privacy/sdk/types";
import type { QueryUserAccountResult } from "@umbra-privacy/sdk/types";
import { generateRandomNonce } from "@umbra-privacy/sdk/utils";
import {
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";
import { address } from "@solana/kit";

import { getProxiedUmbraZkAssetProvider } from "@/lib/umbra/zk-assets";
import { DEFAULT_INDEXER_ENDPOINT } from "@/lib/umbra/config";

export type DueVaultNetwork = "mainnet" | "devnet";

export type DueVaultConfig = {
  network: DueVaultNetwork;
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
  signer: IUmbraSigner;
  masterSeedStorage?: NonNullable<
    Parameters<typeof getUmbraClient>[1]
  >["masterSeedStorage"];
  deferMasterSeedSignature?: boolean;
  preferPollingTransactionForwarder?: boolean;
  indexerApiEndpoint?: string;
  relayerApiEndpoint?: string;
};

type PrivatePaymentRequest = {
  destinationAddress: string;
  mint: string;
  amount: bigint;
  optionalData?: Uint8Array;
  callbacks?: {
    createUtxo?: TransactionCallbacks;
  };
};

type ComplianceGrantRequest = {
  granterAddress: string;
  auditorAddress: string;
};

const DEFAULT_RELAYER_ENDPOINT = "https://relayer.api.umbraprivacy.com";

function toAddress(value: string) {
  return address(value);
}

function toU64(value: bigint) {
  return value as U64;
}

function toU32(value: bigint) {
  return value as U32;
}

function toRcEncryptionNonce(value: bigint | RcEncryptionNonce) {
  return value as RcEncryptionNonce;
}

export const UMBRA_MAINNET_MINTS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  WSOL: "So11111111111111111111111111111111111111112",
  UMBRA: "PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta",
} as const;

export async function createDueVaultClient(config: DueVaultConfig) {
  const deps = {
    ...(config.preferPollingTransactionForwarder
      ? {
          transactionForwarder: getPollingTransactionForwarder({
            rpcUrl: config.rpcUrl,
          }),
        }
      : {}),
    ...(config.masterSeedStorage
      ? {
          masterSeedStorage: config.masterSeedStorage,
        }
      : {}),
  };

  return getUmbraClient(
    {
      signer: config.signer,
      network: config.network,
      rpcUrl: config.rpcUrl,
      rpcSubscriptionsUrl: config.rpcSubscriptionsUrl,
      deferMasterSeedSignature: config.deferMasterSeedSignature,
      indexerApiEndpoint: config.indexerApiEndpoint ?? DEFAULT_INDEXER_ENDPOINT,
    },
    Object.keys(deps).length > 0 ? deps : undefined,
  );
}

export async function registerDueVaultUser(
  config: DueVaultConfig,
  options: UserRegistrationOptions = {},
) {
  const client = await createDueVaultClient(config);
  const zkProver = getUserRegistrationProver(
    typeof window === "undefined"
      ? undefined
      : {
          assetProvider: getProxiedUmbraZkAssetProvider(),
        },
  );
  const register = getUserRegistrationFunction({ client }, { zkProver });

  return register({
    ...options,
    confidential: true,
    anonymous: true,
  });
}

export async function queryDueVaultUserRegistration(
  config: DueVaultConfig,
  userAddress?: string,
) {
  const client = await createDueVaultClient(config);
  const queryUser = getUserAccountQuerierFunction({ client });

  return queryUser(toAddress(userAddress ?? client.signer.address));
}

export function isUmbraUserFullyRegistered(account: QueryUserAccountResult) {
  return (
    account.state === "exists" &&
    account.data.isInitialised &&
    account.data.isUserAccountX25519KeyRegistered &&
    account.data.isUserCommitmentRegistered &&
    account.data.isActiveForAnonymousUsage
  );
}

export async function depositPrivateBalance(
  config: DueVaultConfig,
  mint: string,
  amount: bigint,
) {
  const client = await createDueVaultClient(config);
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });

  return deposit(client.signer.address, toAddress(mint), toU64(amount));
}

export async function withdrawPrivateBalance(
  config: DueVaultConfig,
  mint: string,
  amount: bigint,
) {
  const client = await createDueVaultClient(config);
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });

  return withdraw(client.signer.address, toAddress(mint), toU64(amount));
}

export async function createPrivatePayment(
  config: DueVaultConfig,
  request: PrivatePaymentRequest,
) {
  const client = await createDueVaultClient(config);
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver(
    typeof window === "undefined"
      ? undefined
      : {
          assetProvider: getProxiedUmbraZkAssetProvider(),
        },
  );
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    {
      zkProver,
      hooks: {
        createUtxo: request.callbacks?.createUtxo,
      },
    },
  );
  let optionalData: OptionalData32 | undefined;

  if (request.optionalData) {
    assertOptionalData32(request.optionalData, "payment optional data");
    optionalData = request.optionalData;
  }

  return createUtxo(
    {
      destinationAddress: toAddress(request.destinationAddress),
      mint: toAddress(request.mint),
      amount: toU64(request.amount),
    },
    optionalData ? { optionalData } : undefined,
  );
}

export async function claimIncomingPayments(config: DueVaultConfig) {
  const client = await createDueVaultClient(config);
  const fetchClaimable = getClaimableUtxoScannerFunction({ client });
  const { received } = await fetchClaimable(toU32(0n), toU32(0n));

  if (received.length === 0) {
    return null;
  }

  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  const relayer = getUmbraRelayer({
    apiEndpoint: config.relayerApiEndpoint ?? DEFAULT_RELAYER_ENDPOINT,
  });
  const fetchBatchMerkleProof = getBatchMerkleProofFetcher({
    apiEndpoint: config.indexerApiEndpoint ?? DEFAULT_INDEXER_ENDPOINT,
  });

  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    { zkProver, relayer, fetchBatchMerkleProof },
  );

  return claim(received);
}

export async function issueAuditorGrant(
  config: DueVaultConfig,
  request: ComplianceGrantRequest,
) {
  const client = await createDueVaultClient(config);
  const createGrant = getComplianceGrantIssuerFunction({ client });
  const generateMvkKeypair = getMasterViewingKeyX25519KeypairDeriver({
    client,
  });
  const queryUser = getUserAccountQuerierFunction({ client });

  const [{ x25519Keypair }, auditorAccount] = await Promise.all([
    generateMvkKeypair(),
    queryUser(toAddress(request.auditorAddress)),
  ]);

  if (
    auditorAccount.state !== "exists" ||
    !auditorAccount.data.isUserAccountX25519KeyRegistered
  ) {
    throw new Error("Auditor must register an Umbra X25519 key before access can be granted.");
  }

  const nonce = generateRandomNonce();
  const signature = await createGrant(
    toAddress(request.auditorAddress),
    x25519Keypair.publicKey,
    auditorAccount.data.x25519PublicKey,
    nonce,
  );

  return {
    signature,
    nonce,
    granterAddress: request.granterAddress,
    auditorAddress: request.auditorAddress,
    granterX25519: x25519Keypair.publicKey,
    auditorX25519: auditorAccount.data.x25519PublicKey,
  };
}

export async function revokeAuditorGrant(
  config: DueVaultConfig,
  grant: Awaited<ReturnType<typeof issueAuditorGrant>>,
) {
  const client = await createDueVaultClient(config);
  const revokeGrant = getComplianceGrantRevokerFunction({ client });

  return revokeGrant(
    toAddress(grant.auditorAddress),
    grant.granterX25519,
    grant.auditorX25519,
    grant.nonce,
  );
}

export async function requestAuditorReencryption(
  config: DueVaultConfig,
  grant: Awaited<ReturnType<typeof issueAuditorGrant>>,
  inputEncryptionNonce: bigint | RcEncryptionNonce,
  ciphertexts: readonly Uint8Array[],
) {
  const client = await createDueVaultClient(config);
  const reencrypt = getSharedCiphertextReencryptorForUserGrantFunction({
    client,
  });

  return reencrypt(
    grant.granterX25519,
    grant.auditorX25519,
    grant.nonce,
    toRcEncryptionNonce(inputEncryptionNonce),
    ciphertexts,
  );
}
