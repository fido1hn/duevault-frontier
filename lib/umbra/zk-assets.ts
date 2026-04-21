import { getCdnZkAssetProvider } from "@umbra-privacy/web-zk-prover/cdn";

export const UMBRA_ZK_CDN_BASE_URL = "https://d3j9fjdkre529f.cloudfront.net";
export const UMBRA_ZK_ASSET_PROXY_BASE_PATH = "/api/umbra/zk-assets";

export function getProxiedUmbraZkAssetProvider() {
  return getCdnZkAssetProvider({
    baseUrl: UMBRA_ZK_ASSET_PROXY_BASE_PATH,
    manifestUrl: `${UMBRA_ZK_ASSET_PROXY_BASE_PATH}/manifest.json`,
  });
}
