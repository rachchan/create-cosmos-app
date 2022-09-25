import { useEffect, useState } from 'react';
import { Container, Button } from '@chakra-ui/react';
import { useWallet } from '@cosmos-kit/react';
import { StdFee } from '@cosmjs/amino';
import { assets } from 'chain-registry';
import { AssetList, Asset } from '@chain-registry/types';
import { SigningStargateClient } from '@cosmjs/stargate';
import BigNumber from 'bignumber.js';

import { WalletStatus } from '@cosmos-kit/core';
import { WalletSection } from '../components';
import { cosmos } from 'interchain';

const chainName = 'cosmoshub';
const hubAssets: AssetList = assets.find(
  (chain) => chain.chain_name === chainName
) as AssetList;
const atom: Asset = hubAssets.assets.find(
  (asset) => asset.base === 'uatom'
) as Asset;

const sendTokens = (
  getStargateClient: () => Promise<SigningStargateClient>,
  setResp: () => any,
  address: string
) => {
  return async () => {
    const stargateClient = await getStargateClient();
    if (!stargateClient || !address) {
      console.error('stargateClient undefined or address undefined.');
      return;
    }

    const { send } = cosmos.bank.v1beta1.MessageComposer.withTypeUrl;

    const msg = send({
      amount: [
        {
          denom: 'uatom',
          amount: '1000'
        }
      ],
      toAddress: address,
      fromAddress: address
    });

    const fee: StdFee = {
      amount: [
        {
          denom: 'uatom',
          amount: '864'
        }
      ],
      gas: '86364'
    };
    const response = await stargateClient.signAndBroadcast(address, [msg], fee);
    setResp(JSON.stringify(response, null, 2));
  };
};

export default function Home() {
  const {
    getStargateClient,
    address,
    setCurrentChain,
    currentWallet,
    walletStatus
  } = useWallet();

  useEffect(() => {
    setCurrentChain(chainName);
  }, [chainName]);

  const [balance, setBalance] = useState(new BigNumber(0));
  const [resp, setResp] = useState('');
  const getBalance = async () => {
    if (!address) {
      setBalance(new BigNumber(0));
      return;
    }

    let restEndpoint = await currentWallet?.getRestEndpoint();

    if (!restEndpoint) {
      console.log('no rest endpoint — using a fallback');
      restEndpoint = `https://rest.cosmos.directory/${chainName}`;
    }

    // get LCD client
    const client = await cosmos.ClientFactory.createLCDClient({
      restEndpoint
    });

    // fetch balance
    const balance = await client.cosmos.bank.v1beta1.balance({
      address,
      denom: hubAssets?.assets[0].base as string
    });

    // Get the display exponent
    // we can get the exponent from chain registry asset denom_units
    const exp = atom.denom_units.find((unit) => unit.denom === atom.display)
      ?.exponent as number;

    // show balance in display values by exponentiating it
    const a = new BigNumber(balance.balance.amount);
    const amount = a.multipliedBy(10 ** -exp);
    setBalance(amount);
  };

  return (
    <Container maxW="5xl" py={10}>
      <WalletSection />

      {walletStatus === WalletStatus.Disconnected && (
        <>please connect your wallet!</>
      )}

      {walletStatus === WalletStatus.Connected && (
        <>
          <Container>Balance: {balance.toNumber()} </Container>

          <Button onClick={getBalance}>Fetch Balance</Button>

          <Button
            onClick={sendTokens(
              getStargateClient as () => Promise<SigningStargateClient>,
              setResp as () => any,
              address as string
            )}
          >
            Send Tokens (to self)
          </Button>
        </>
      )}

      {!!resp && (
        <>
          <Container>Response: </Container>
          <pre>{resp}</pre>
        </>
      )}
    </Container>
  );
}