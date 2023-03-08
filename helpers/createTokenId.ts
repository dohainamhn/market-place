interface Params {
  tokenIndex: number;
  tokenSupply: number;
  creatorAddress: string;
}

export const createTokenId = ({ creatorAddress, tokenSupply, tokenIndex }: Params) => {
  const supplyBits = 40;
  const indexBits = 56;

  let value;
  value = BigInt(tokenSupply);
  value |= BigInt(tokenIndex) << BigInt(supplyBits);
  value |= BigInt(creatorAddress) << BigInt(indexBits + supplyBits);
  return value.toString();
};
