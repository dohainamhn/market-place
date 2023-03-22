export const CollectionName = 'OpenStore collection';
export const CollectionSymbol = 'OpenStore';
export const TemplateUri =
  'https://testnets-api.opensea.io/api/v1/metadata/0xf4910c763ed4e47a585e2d34baa9a4b611ae448c/0x{id}';
export const EIP712DomainName = 'Contract Verify';
export const DefaultExpiredSigTime = 3600;

export const EIP712OfferTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Offer: [
    { name: 'offerId', type: 'uint256' },
    { name: 'nftId', type: 'uint256' },
    { name: 'collectionAddress', type: 'address' },
    { name: 'nftAmount', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'tokenAmount', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

export const EIP712OrderTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
    { name: 'orderId', type: 'uint256' },
    { name: 'nftId', type: 'uint256' },
    { name: 'collectionAddress', type: 'address' },
    { name: 'nftAmount', type: 'uint256' },
    { name: 'ethAmount', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

export type PrimaryOfferType = 'EIP712Domain' | 'Offer';
export enum PrimaryOfferTypeEnum {
  EIP712Domain = 'EIP712Domain',
  Offer = 'Offer',
}

export type PrimaryOrderType = 'EIP712Domain' | 'Order';
export enum PrimaryOrderTypeEnum {
  EIP712Domain = 'EIP712Domain',
  Order = 'Order',
}
