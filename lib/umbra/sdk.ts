import {
  getBatchMerkleProofFetcher,
  getClaimableUtxoScannerFunction,
  getComplianceGrantIssuerFunction,
  getComplianceGrantRevokerFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getMasterViewingKeyX25519KeypairDeriver,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getSharedCiphertextReencryptorForUserGrantFunction,
  getUmbraClient,
  getUmbraRelayer,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import type { IUmbraSigner } from "@umbra-privacy/sdk/interfaces";
import type { RcEncryptionNonce, U32, U64 } from "@umbra-privacy/sdk/types";
import { generateRandomNonce } from "@umbra-privacy/sdk/utils";
import {
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
} from "@umbra-privacy/web-zk-prover";
import { address } from "@solana/kit";

type SettlemarkNetwork = "mainnet" | "devnet";

type SettlemarkConfig = {
  network: SettlemarkNetwork;
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
  signer: IUmbraSigner;
  indexerApiEndpoint?: string;
  relayerApiEndpoint?: string;
};

type PrivatePaymentRequest = {
  destinationAddress: string;
  mint: string;
  amount: bigint;
};

type ComplianceGrantRequest = {
  granterAddress: string;
  auditorAddress: string;
};

const DEFAULT_INDEXER_ENDPOINT = "https://indexer.api.umbraprivacy.com";
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

export async function createSettlemarkClient(config: SettlemarkConfig) {
  return getUmbraClient({
    signer: config.signer,
    network: config.network,
    rpcUrl: config.rpcUrl,
    rpcSubscriptionsUrl: config.rpcSubscriptionsUrl,
    indexerApiEndpoint: config.indexerApiEndpoint ?? DEFAULT_INDEXER_ENDPOINT,
  });
}

export async function registerSettlemarkUser(config: SettlemarkConfig) {
  const client = await createSettlemarkClient(config);
  const register = getUserRegistrationFunction({ client });

  return register({
    confidential: true,
    anonymous: true,
  });
}

export async function depositPrivateBalance(
  config: SettlemarkConfig,
  mint: string,
  amount: bigint,
) {
  const client = await createSettlemarkClient(config);
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });

  return deposit(client.signer.address, toAddress(mint), toU64(amount));
}

export async function withdrawPrivateBalance(
  config: SettlemarkConfig,
  mint: string,
  amount: bigint,
) {
  const client = await createSettlemarkClient(config);
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });

  return withdraw(client.signer.address, toAddress(mint), toU64(amount));
}

export async function createPrivatePayment(
  config: SettlemarkConfig,
  request: PrivatePaymentRequest,
) {
  const client = await createSettlemarkClient(config);
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );

  return createUtxo({
    destinationAddress: toAddress(request.destinationAddress),
    mint: toAddress(request.mint),
    amount: toU64(request.amount),
  });
}

export async function claimIncomingPayments(config: SettlemarkConfig) {
  const client = await createSettlemarkClient(config);
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
  config: SettlemarkConfig,
  request: ComplianceGrantRequest,
) {
  const client = await createSettlemarkClient(config);
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
  config: SettlemarkConfig,
  grant: Awaited<ReturnType<typeof issueAuditorGrant>>,
) {
  const client = await createSettlemarkClient(config);
  const revokeGrant = getComplianceGrantRevokerFunction({ client });

  return revokeGrant(
    toAddress(grant.auditorAddress),
    grant.granterX25519,
    grant.auditorX25519,
    grant.nonce,
  );
}

export async function requestAuditorReencryption(
  config: SettlemarkConfig,
  grant: Awaited<ReturnType<typeof issueAuditorGrant>>,
  inputEncryptionNonce: bigint | RcEncryptionNonce,
  ciphertexts: readonly Uint8Array[],
) {
  const client = await createSettlemarkClient(config);
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
