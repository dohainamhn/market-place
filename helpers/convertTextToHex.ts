export const convertTextToHex = (text: string) => {
  return '0x' + Buffer.from(text, 'utf8').toString('hex');
};
