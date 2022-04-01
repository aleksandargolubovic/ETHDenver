import { Button, Col, Menu, Row } from "antd";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeMetisPrice } from "./hooks";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { Link, Route, Switch, useLocation, Redirect } from "react-router-dom";
import {
  Account,
  Header,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Web3ModalSetup } from "./helpers";
import { Requests, RefundView } from "./views";
import { useStaticJsonRPC } from "./hooks";
import FixedPlugin from "./components/FixedPlugin";
import { BackgroundColorContext } from "./contexts/BackgroundColorContext";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import routes from "./routes";
import logo from "./assets/img/react-logo.png";

const { ethers } = require("ethers");

const initialNetwork = NETWORKS.testnetMetis;// <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = false; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];
  const [sidebarOpened, setsidebarOpened] = useState(
    document.documentElement.className.indexOf("nav-open") !== -1
  );
  const mainPanelRef = useRef(null);
  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of METIS from 🦄 Uniswap: */
  const price = useExchangeMetisPrice(targetNetwork, mainnetProvider);

  console.log("PRICE: ", price);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  // const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // // The transactor wraps transactions and provides notificiations
  // const tx = Transactor(userSigner, gasPrice);

  // // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  // const yourLocalBalance = useBalance(localProvider, address);

  // // Just plug in different 🛰 providers to get your balance on different chains:
  // const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = {
    deployedContracts: deployedContracts || {},
    externalContracts: externalContracts || {},};
  
  // const refund = {
  //   abi,
  //   address: "0xCafac3dD18aC6c6e92c921884f9E4176737C052c"};
  
  // const myCustomcontract = {
  //   31337: {
  //     contracts: {
  //       r: refund
  //     }
  //   }
  // }

  // const contractConfig2 = {
  //   deployedContracts: {},
  //   externalContracts:  myCustomcontract || {},};

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);
  console.log(readContracts);
  // // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  // const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // Refund contract instance.
  const [refundInstance, setRefundInstance] = useState();
  const [isApprover, setIsApprover] = useState(false);
  const [isMember, setIsMember] = useState(false);
  // // EXTERNAL CONTRACT EXAMPLE:
  // //
  // // If you want to bring in the mainnet DAI contract it would look like:
  // const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // const myLocalContracts = useContractLoader(localProvider, contractConfig2);

  // console.log("My local", myLocalContracts);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // // Then read your DAI balance like:
  // const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
  //   "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  // ]);

  // // keep track of a variable from the contract in the local React state:
  // const purpose = useContractReader(readContracts, "YourContract", "purpose");

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  // useEffect(() => {
  //   if (
  //     DEBUG &&
  //     mainnetProvider &&
  //     address &&
  //     selectedChainId &&
  //     yourLocalBalance &&
  //     yourMainnetBalance &&
  //     readContracts &&
  //     writeContracts &&
  //     mainnetContracts
  //   ) {
  //     // console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
  //     // console.log("🌎 mainnetProvider", mainnetProvider);
  //     // console.log("🏠 localChainId", localChainId);
  //     // console.log("👩‍💼 selected address:", address);
  //     // console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
  //     // console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
  //     // console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
  //     // console.log("📝 readContracts", readContracts);
  //     // console.log("🌍 DAI contract on mainnet:", mainnetContracts);
  //     // console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
  //     // console.log("🔐 writeContracts", writeContracts);
  //   }
  // }, [
  //   mainnetProvider,
  //   address,
  //   selectedChainId,
  //   yourLocalBalance,
  //   yourMainnetBalance,
  //   readContracts,
  //   writeContracts,
  //   mainnetContracts,
  //   localChainId,
  //   myMainnetDAIBalance,
  // ]);

  // this function opens and closes the sidebar on small devices
  const toggleSidebar = () => {
    document.documentElement.classList.toggle("nav-open");
    setsidebarOpened(!sidebarOpened);
  };
  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      return (
        <Route
          path={prop.layout + prop.path}
          component={prop.component}
          key={key}
        />
      );
    });
  };
  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  return (
    <BackgroundColorContext.Consumer>
      {({ color, changeColor }) => (
        <div className="wrapper">
          {/* ✏️ Edit the header and change the title to your project name */}
          <Header />
          <Sidebar
            routes={routes}
            logo={{
              outterLink: "https://github.com/aleksandargolubovic/ETHDenver",
              text: "🧾  Refund",
              imgSrc: logo,
            }}
            toggleSidebar={toggleSidebar}
          />
          <div className="main-panel" ref={mainPanelRef} data={color}>
          <NetworkDisplay
            NETWORKCHECK={NETWORKCHECK}
            localChainId={localChainId}
            selectedChainId={selectedChainId}
            targetNetwork={targetNetwork}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
          />
          {/* <Menu 
            style={{ textAlign: "center", marginTop: 40 }} 
            selectedKeys={[location.pathname]} mode="horizontal">
            <Menu.Item key="/home">
              <Link to="/home">Home</Link>
            </Menu.Item>
            {refundInstance && 
            <Menu.Item key="/requests">
              <Link to="/requests">Reimbursement Requests</Link>
            </Menu.Item>}
          </Menu> */}

          <Switch>
            <Route exact path="/">
            <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
              {!userSigner ? <h1>Please connect your wallet</h1> :
                <Redirect to="/home"></Redirect>
              }
            </div>
            </Route>
            <Route path="/home">
              <RefundView
                address={address}
                mainnetProvider={mainnetProvider}
                localProvider={localProvider}
                price={price}
                blockExplorer={blockExplorer}
                provider={localProvider}
                contractConfig={contractConfig}
                signer={userSigner}
                setRefundInstance={setRefundInstance}
                refundInstance={refundInstance}
                setIsApprover={setIsApprover}
                isApprover={isApprover}
                setIsMember={setIsMember}
                isMember={isMember}
              />
            </Route>
            <Route path="/requests">
              <Requests
                localProvider={localProvider}
                price={price}
                address={address}
                refundInstance={refundInstance}
                signer={userSigner}
                isApprover={isApprover}
              />
            </Route>
          </Switch>

          {/* <ThemeSwitch /> */}

          {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
          <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
              {USE_NETWORK_SELECTOR && (
                <div style={{ marginRight: 20 }}>
                  <NetworkSwitch
                    networkOptions={networkOptions}
                    selectedNetwork={selectedNetwork}
                    setSelectedNetwork={setSelectedNetwork}
                  />
                </div>
              )}
              <Account
                useBurner={USE_BURNER_WALLET}
                address={address}
                localProvider={localProvider}
                userSigner={userSigner}
                mainnetProvider={mainnetProvider}
                price={price}
                web3Modal={web3Modal}
                loadWeb3Modal={loadWeb3Modal}
                logoutOfWeb3Modal={logoutOfWeb3Modal}
                blockExplorer={blockExplorer}
              />
            </div>
            {/* {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
              <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
            )} */}
          </div>

          {/* <div style={{ position: "fixed", textAlign: "left", left: 10, bottom: 8 }}>
            <Row align="middle" gutter={[4, 4]}>
              <Col>
                <Button
                  size="middle"
                  shape="round"
                >
                  <span style={{ marginRight: 8 }} role="img" aria-label="about">
                    ❔
                  </span>
                  About
                </Button>
              </Col>
              <Col>
                <Button
                  size="middle"
                  shape="round"
                >
                  <span style={{ marginRight: 8 }} role="img" aria-label="tearms of use">
                    📄
                  </span>
                  Tearms of use
                </Button>
              </Col>
              <Col>
                <Button
                  size="middle"
                  shape="round"
                >
                  <span style={{ marginRight: 8 }} role="img" aria-label="support">
                    💬
                  </span>
                  Support
                </Button>
              </Col>
            </Row> */}
    {/*
            <Row align="middle" gutter={[4, 4]}>
              <Col span={24}>
                {
                  faucetAvailable ? (
                    <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
                  ) : (
                    ""
                  )
                }
              </Col>
              </Row>*/}
          {/* </div> */}
          <Footer fluid />
          </div>
          <FixedPlugin bgColor={color} handleBgClick={changeColor} />
        </div>
      )}
    </BackgroundColorContext.Consumer>
  );
}

export default App;
