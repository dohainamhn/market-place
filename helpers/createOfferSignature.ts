import { SignTypedDataVersion, signTypedData } from '@metamask/eth-sig-util';
import { PrimaryOfferType } from '../consts';
interface Params {
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    Offer: {
      name: string;
      type: string;
    }[];
  };
  primaryType: PrimaryOfferType;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: {
    nftId: string;
    collectionAddress: string;
    nftAmount: string;
    tokenAddress: string;
    tokenAmount: string;
    buyer: string;
    seller: string;
    timestamp: string;
  };
}

export const createOfferSignature = (params: Params, privateKey: string) => {
  const signature = signTypedData({
    privateKey: privateKey as unknown as Buffer,
    data: params,
    version: SignTypedDataVersion.V4,
  });
  const r = signature.slice(0, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);

  return {
    r,
    v,
    s,
  };
};
