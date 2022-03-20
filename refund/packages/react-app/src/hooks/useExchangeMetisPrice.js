import { Token, WETH, Fetcher, Route } from '@uniswap/sdk';
import { useCallback, useState } from 'react';
import { useOnRepetition } from "eth-hooks";
/**
 * Get the Exchange price of ETH/USD (extrapolated from WETH/DAI)
 * @param targetNetwork (TNetwork)
 * @param mainnetProvider (TEthersProvider)
 * @param pollTime (number) :: if >0 use polling, else use instead of onBlock event
 * @returns (number) :: price
 */
export const useExchangeMetisPrice = (targetNetwork, mainnetProvider, pollTime = 0) => {
    const [price, setPrice] = useState(0);
    const pollPrice = useCallback(() => {
        const getPrice = async () => {
            if (!mainnetProvider) {
                return;
            }
            else if (targetNetwork.price) {
                setPrice(targetNetwork.price);
            }
            else {
                const network = await mainnetProvider.getNetwork();
                const DAI = new Token(network ? network.chainId : 1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18);
                const METIS = new Token(network ? network.chainId : 1, '0x9E32b13ce7f2E80A01932B42553652E053D6ed8e', 18);

                //const DAIWETHPair = await Fetcher.fetchPairData(USDC, WETH[ChainId.MAINNET]);
                const DAIWETHPair = await Fetcher.fetchPairData(DAI, WETH[DAI.chainId], mainnetProvider);
                const route1 = new Route([DAIWETHPair], WETH[DAI.chainId]);
                const price1 = parseFloat(route1.midPrice.toSignificant(6));
                console.log("PRICE1: ", price1);

                const WETHMETISPair = await Fetcher.fetchPairData(WETH[DAI.chainId], METIS, mainnetProvider);
                const route = new Route([WETHMETISPair], WETH[DAI.chainId]);
                const price2 = parseFloat(route.midPrice.toSignificant(6));
                console.log("PRICE2: ", price2);
                //const route = new Route([pair], WETH[DAI.chainId]);
                setPrice(price1/price2);
            }
        };
        void getPrice();
    }, [targetNetwork.price, mainnetProvider]);
    useOnRepetition(pollPrice, { pollTime, provider: mainnetProvider });
    return price;
};
