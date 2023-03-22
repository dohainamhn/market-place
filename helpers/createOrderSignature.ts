import { SignTypedDataVersion, signTypedData } from '@metamask/eth-sig-util';
import { PrimaryOfferType, PrimaryOrderType } from '../consts';
interface Params {
  types: {
    EIP712Domain: {
      name: string;
      type: string;
    }[];
    Order: {
      name: string;
      type: string;
    }[];
  };
  primaryType: PrimaryOrderType;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: {
    orderId: string,
    nftId: string;
    collectionAddress: string;
    nftAmount: string;
    ethAmount: string;
    buyer: string;
    seller: string;
    timestamp: string;
  };
}

export const createOrderSignature = (params: Params, privateKey: string) => {
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
