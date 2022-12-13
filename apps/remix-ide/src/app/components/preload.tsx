import { RemixApp } from "@remix-ui/app";
import React, { useEffect, useRef, useState } from "react";
import { render } from "react-dom";
import * as packageJson from "../../../../../package.json";
import { fileSystem, fileSystems } from "../files/fileSystem";
import { indexedDBFileSystem } from "../files/filesystems/indexedDB";
import { localStorageFS } from "../files/filesystems/localStorage";
import {
  fileSystemUtility,
  migrationTestData,
} from "../files/filesystems/fileSystemUtility";
import "./styles/preload.css";
const _paq = (window._paq = window._paq || []);

export const Preload = () => {
  const [supported, setSupported] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [showDownloader, setShowDownloader] = useState<boolean>(false);
  const remixFileSystems = useRef<fileSystems>(new fileSystems());
  const remixIndexedDB = useRef<fileSystem>(new indexedDBFileSystem());
  const localStorageFileSystem = useRef<fileSystem>(new localStorageFS());
  // url parameters to e2e test the fallbacks and error warnings
  const testmigrationFallback = useRef<boolean>(
    window.location.hash.includes("e2e_testmigration_fallback=true") &&
      window.location.host === "127.0.0.1:8080" &&
      window.location.protocol === "http:"
  );
  const testmigrationResult = useRef<boolean>(
    window.location.hash.includes("e2e_testmigration=true") &&
      window.location.host === "127.0.0.1:8080" &&
      window.location.protocol === "http:"
  );
  const testBlockStorage = useRef<boolean>(
    window.location.hash.includes("e2e_testblock_storage=true") &&
      window.location.host === "127.0.0.1:8080" &&
      window.location.protocol === "http:"
  );

  function loadAppComponent() {
    import("../../app")
      .then((AppComponent) => {
        const appComponent = new AppComponent.default();
        appComponent.run().then(() => {
          render(
            <>
              <RemixApp app={appComponent} />
            </>,
            document.getElementById("root")
          );
        });
      })
      .catch((err) => {
        _paq.push(["trackEvent", "Preload", "error", err && err.message]);
        console.log("Error loading Remix:", err);
        setError(true);
      });
  }

  const downloadBackup = async () => {
    setShowDownloader(false);
    const fsUtility = new fileSystemUtility();
    await fsUtility.downloadBackup(
      remixFileSystems.current.fileSystems["localstorage"]
    );
    await migrateAndLoad();
  };

  const migrateAndLoad = async () => {
    setShowDownloader(false);
    const fsUtility = new fileSystemUtility();
    const migrationResult = await fsUtility.migrate(
      localStorageFileSystem.current,
      remixIndexedDB.current
    );
    _paq.push([
      "trackEvent",
      "Migrate",
      "result",
      migrationResult ? "success" : "fail",
    ]);
    await setFileSystems();
  };

  const setFileSystems = async () => {
    const fsLoaded = await remixFileSystems.current.setFileSystem([
      testmigrationFallback.current || testBlockStorage.current
        ? null
        : remixIndexedDB.current,
      testBlockStorage.current ? null : localStorageFileSystem.current,
    ]);
    if (fsLoaded) {
      console.log(fsLoaded.name + " activated");
      _paq.push(["trackEvent", "Storage", "activate", fsLoaded.name]);
      loadAppComponent();
    } else {
      _paq.push(["trackEvent", "Storage", "error", "no supported storage"]);
      setSupported(false);
    }
  };

  const testmigration = async () => {
    if (testmigrationResult.current) {
      const fsUtility = new fileSystemUtility();
      fsUtility.populateWorkspace(
        migrationTestData,
        remixFileSystems.current.fileSystems["localstorage"].fs
      );
    }
  };

  useEffect(() => {
    async function loadStorage() {
      (await remixFileSystems.current.addFileSystem(remixIndexedDB.current)) ||
        _paq.push([
          "trackEvent",
          "Storage",
          "error",
          "indexedDB not supported",
        ]);
      (await remixFileSystems.current.addFileSystem(
        localStorageFileSystem.current
      )) ||
        _paq.push([
          "trackEvent",
          "Storage",
          "error",
          "localstorage not supported",
        ]);
      await testmigration();
      remixIndexedDB.current.loaded &&
        (await remixIndexedDB.current.checkWorkspaces());
      localStorageFileSystem.current.loaded &&
        (await localStorageFileSystem.current.checkWorkspaces());
      remixIndexedDB.current.loaded &&
        (remixIndexedDB.current.hasWorkSpaces ||
        !localStorageFileSystem.current.hasWorkSpaces
          ? await setFileSystems()
          : setShowDownloader(true));
      !remixIndexedDB.current.loaded && (await setFileSystems());
    }
    loadStorage();
  }, []);

  return (
    <>
      <div className="preload-container">
        <div className="preload-logo pb-4">
          {logo}
          <div className="info-secondary splash">
            <span className="version"> v{packageJson.version}</span>
          </div>
        </div>
        {!supported ? (
          <div className="preload-info-container alert alert-warning">
            Your browser does not support any of the filesystems required by
            Remix. Either change the settings in your browser or use a supported
            browser.
          </div>
        ) : null}
        {error ? (
          <div className="preload-info-container alert alert-danger text-left">
            An unknown error has occurred while loading the application.
            <br></br>
            Doing a hard refresh might fix this issue:<br></br>
            <div className="pt-2">
              Windows:<br></br>- Chrome: CTRL + F5 or CTRL + Reload Button
              <br></br>- Firefox: CTRL + SHIFT + R or CTRL + F5<br></br>
            </div>
            <div className="pt-2">
              MacOS:<br></br>- Chrome & FireFox: CMD + SHIFT + R or SHIFT +
              Reload Button<br></br>
            </div>
            <div className="pt-2">
              Linux:<br></br>- Chrome & FireFox: CTRL + SHIFT + R<br></br>
            </div>
          </div>
        ) : null}
        {showDownloader ? (
          <div className="preload-info-container alert alert-info">
            This app will be updated now. Please download a backup of your files
            now to make sure you don't lose your work.
            <br></br>
            You don't need to do anything else, your files will be available
            when the app loads.
            <div
              onClick={async () => {
                await downloadBackup();
              }}
              data-id="downloadbackup-btn"
              className="btn btn-primary mt-1"
            >
              download backup
            </div>
            <div
              onClick={async () => {
                await migrateAndLoad();
              }}
              data-id="skipbackup-btn"
              className="btn btn-primary mt-1"
            >
              skip backup
            </div>
          </div>
        ) : null}
        {supported && !error && !showDownloader ? (
          <div>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
          </div>
        ) : null}
      </div>
    </>
  );
};

const logo = (
  <svg
    width="210px"
    height="36px"
    viewBox="0 0 210 36"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>AltLayer - Original - Complete - Blue</title>
    <g
      id="页面-1"
      stroke="none"
      stroke-width="1"
      fill="none"
      fill-rule="evenodd"
    >
      <g
        id="ALTLAYER"
        transform="translate(-40.000000, -24.000000)"
        fill="#6667AB"
        fill-rule="nonzero"
      >
        <g
          id="AltLayer---Original---Complete---Blue"
          transform="translate(40.000000, 24.000000)"
        >
          <path
            d="M20.2082837,35.9700778 C20.4758543,35.9704642 20.7408988,35.9179994 20.9882607,35.8155959 C21.2354283,35.7131923 21.4600554,35.5629875 21.6491231,35.3737255 L37.581912,19.4409366 C37.771174,19.251694 37.9211845,19.0270669 38.0235881,18.7798604 C38.1259916,18.532654 38.1788451,18.2676872 38.1788451,18.0000972 C38.1788451,17.7325071 38.1259916,17.4675404 38.0235881,17.2203145 C37.9211845,16.973108 37.771174,16.7485003 37.581912,16.559316 L21.6491231,0.626546552 C21.4600554,0.43712523 21.2354283,0.28692622 20.9882607,0.184580373 C20.7408988,0.0822351093 20.4758543,0.0297611555 20.2082837,0.0301718471 L20.2082837,35.9700778 Z"
            id="路径"
          ></path>
          <path
            d="M17.9711448,29.2652658 C17.4498583,29.2652658 16.9285717,29.1422649 16.5309855,28.8912111 L0.596371993,18.9030362 C-0.198790664,18.4045038 -0.198790664,17.5958071 0.596371993,17.0972942 L16.5297613,7.10915813 C16.9273475,6.85989194 17.4486341,6.73496737 17.9699207,6.73496737 L17.9711448,29.2652658 Z"
            id="路径"
            opacity="0.5"
          ></path>
          <path
            d="M17.9711448,22.5297544 C17.4498583,22.5297544 16.9285717,22.4067535 16.5309855,22.1562826 L0.596371993,12.1680688 C-0.198790664,11.6695558 -0.198790664,10.8608398 0.596371993,10.3617244 L16.5297613,0.374194649 C16.9248797,0.123090048 17.4486341,0 17.9711448,0 L17.9711448,22.5297544 Z"
            id="路径"
            opacity="0.5"
          ></path>
          <path
            d="M17.9711448,36 C17.4498583,36 16.9285717,35.8769991 16.5309855,35.6259453 L0.596371993,25.6383922 C-0.198790664,25.1391991 -0.198790664,24.3304636 0.596371993,23.8320478 L16.5297613,13.8438729 C16.9273475,13.5946261 17.4486341,13.4703039 17.9699207,13.4703039 L17.9711448,36 Z"
            id="路径"
            opacity="0.5"
          ></path>
          <path
            d="M44.3867936,30.2992114 L53.7822715,5.70267344 L60.4291757,5.70267344 L69.8246536,30.2992114 L63.4068457,30.2992114 L61.1910815,24.7231725 L52.980337,24.7231725 L50.8030469,30.2992114 L44.3867936,30.2992114 Z M53.8205514,20.1779702 L60.3510614,20.1779702 L57.0669579,11.6232896 L53.8205514,20.1779702 Z"
            id="形状"
            opacity="0.5"
          ></path>
          <polygon
            id="路径"
            opacity="0.5"
            points="71.9700761 30.2992114 71.9700761 5.70267344 78.1191474 5.70267344 78.1191474 25.5631926 89.7327214 25.5631926 89.7327214 30.2992114"
          ></polygon>
          <path
            d="M122.121976,30.2992114 L131.517454,5.70267344 L138.164164,5.70267344 L147.559641,30.2992114 L141.142417,30.2992114 L138.926847,24.7231725 L130.715519,24.7231725 L128.538618,30.2992114 L122.121976,30.2992114 Z M131.555539,20.1779702 L138.086632,20.1779702 L134.80214,11.6232896 L131.555539,20.1779702 Z"
            id="形状"
          ></path>
          <polygon
            id="路径"
            points="151.793941 30.2992114 151.793941 21.2470866 142.96897 5.70267344 149.385223 5.70267344 154.884702 15.9006688 160.386319 5.70267344 166.802378 5.70267344 157.981098 21.2470866 157.981098 30.2992114"
          ></polygon>
          <polygon
            id="路径"
            points="168.862302 30.2992114 168.862302 5.70267344 187.00386 5.70267344 187.00386 10.4416264 175.011179 10.4416264 175.011179 15.597869 185.590807 15.597869 185.590807 20.4099813 175.011179 20.4099813 175.011179 25.5663016 187.00386 25.5663016 187.00386 30.3021261"
          ></polygon>
          <path
            d="M189.082244,30.2992114 L189.082244,5.70267344 L201.381358,5.70267344 C204.282468,5.70267344 206.421867,6.46663896 207.797612,7.99460886 C209.171413,9.52255933 209.859285,11.5722044 209.859285,14.1435636 C209.859285,15.7991202 209.439566,17.2503554 208.598186,18.4972499 C207.758749,19.7440667 206.612295,20.6736656 205.160768,21.2859495 C205.500818,21.5457475 205.792289,21.8622852 206.023523,22.2213778 C206.295563,22.6791819 206.532626,23.1581663 206.728884,23.6534731 L209.631937,30.3003773 L203.213741,30.3003773 L200.464195,24.0368549 C200.234905,23.5034626 199.94149,23.1152229 199.585895,22.8719416 C199.228357,22.6286603 198.719254,22.5076025 198.058586,22.5087684 L195.231315,22.5087684 L195.231315,30.3003773 L189.082244,30.2992114 Z M195.231315,17.771642 L199.77438,17.771642 C200.971355,17.771642 201.90795,17.4725342 202.58222,16.8743187 C203.25649,16.2761031 203.594596,15.3658385 203.594596,14.1435636 C203.594596,11.6743748 202.411223,10.4393724 200.042534,10.4385562 L195.231315,10.4385562 L195.231315,17.771642 Z"
            id="形状"
          ></path>
          <polygon
            id="路径"
            points="120.025715 25.5633869 108.41525 25.5633869 108.41525 5.70279003 108.371529 5.70279003 108.371529 5.69109232 102.217017 5.69109232 102.217017 30.3091214 108.371529 30.3091214 108.371529 30.2992114 120.025715 30.2992114"
          ></polygon>
          <polygon
            id="路径"
            opacity="0.5"
            points="86.6025147 10.4385562 93.943509 10.4385562 93.943509 30.2992114 99.9977551 30.2992114 99.9977551 5.70267344 86.6025147 5.70267344"
          ></polygon>
        </g>
      </g>
    </g>
  </svg>
);
