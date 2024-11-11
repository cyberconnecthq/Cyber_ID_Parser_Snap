import type { OnNameLookupHandler } from '@metamask/snaps-sdk';

const CYBER_TESTNET_ID = 111557560;
const CYBER_MAINNET_ID = 7560;

export const getCyberIdOwner = async (domain: string, isTestnet: boolean) => {
  try {
    const baseUrl = isTestnet
      ? 'https://api.stg.cyberconnect.dev/v3/'
      : 'https://api.cyberconnect.dev/v3/';
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Connection: 'keep-alive',
        Origin: 'altair://-',
      },
      body: JSON.stringify({
        query:
          'query cyberIdOwner($name: String!) {\n  cyberIdByName(name: $name) {\n    tokenId\n    name\n    owner {\n      address\n    }\n  }\n}',
        variables: {
          name: domain,
        },
      }),
    });
    const data = await response.json();
    return data?.data?.cyberIdByName?.owner?.address;
  } catch (_err) {
    return null;
  }
};

export const getHoldingCyberIds = async (
  address: string,
  isTestnet: boolean,
) => {
  try {
    const baseUrl = isTestnet
      ? 'https://api.stg.cyberconnect.dev/v3/'
      : 'https://api.cyberconnect.dev/v3/';
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Connection: 'keep-alive',
        Origin: 'altair://-',
      },
      body: JSON.stringify({
        query:
          'query holdingCyberIds($address: AddressEVM!, $chainId: ChainId!) {\n  wallet(address: $address, chainId: $chainId) {\n    cyberIds {\n      edges {\n        node {\n          tokenId\n          name\n        }\n      }\n    }\n  }\n}',
        variables: {
          address,
          chainId: isTestnet ? CYBER_TESTNET_ID : CYBER_MAINNET_ID,
        },
      }),
    });
    const data = await response.json();
    return data?.data?.wallet?.cyberIds?.edges?.map?.(
      (item: { node?: { name?: string } }) => item?.node?.name,
    );
  } catch (_err) {
    return null;
  }
};

export const onNameLookup: OnNameLookupHandler = async (request) => {
  const { chainId, address, domain } = request;

  const chainIdDecimal = parseInt(chainId.split(':')[1] ?? '', 10);

  if (isNaN(chainIdDecimal)) {
    return null;
  }

  let isTestnet = false;

  if (chainIdDecimal === CYBER_MAINNET_ID) {
    isTestnet = false;
  } else if (chainIdDecimal === CYBER_TESTNET_ID) {
    isTestnet = true;
  } else {
    return null;
  }

  if (address) {
    const resolvedDomain = await getHoldingCyberIds(address, isTestnet);
    if (!resolvedDomain?.length) {
      return null;
    }
    return {
      resolvedDomains: resolvedDomain.map((str: string) => ({
        resolvedDomain: str,
        protocol: 'Cyber ID Protocol',
      })),
    };
  }

  if (domain) {
    const resolvedAddress = await getCyberIdOwner(domain, isTestnet);
    if (!resolvedAddress) {
      return null;
    }
    return {
      resolvedAddresses: [
        { resolvedAddress, protocol: 'Cyber ID Protocol', domainName: domain },
      ],
    };
  }

  return null;
};
