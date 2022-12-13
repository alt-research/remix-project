import React, { useState, useEffect } from "react"; // eslint-disable-line

import "./remix-ui-home-tab.css";
import { ThemeContext, themes } from "./themeContext";
import HomeTabTitle from "./components/homeTabTitle";
import HomeTabFile from "./components/homeTabFile";
import HomeTabLearn from "./components/homeTabLearn";
import HomeTabScamAlert from "./components/homeTabScamAlert";
import HomeTabGetStarted from "./components/homeTabGetStarted";
import HomeTabFeatured from "./components/homeTabFeatured";
import HomeTabFeaturedPlugins from "./components/homeTabFeaturedPlugins";

declare global {
  interface Window {
    _paq: any;
  }
}

export interface RemixUiHomeTabProps {
  plugin: any;
}

export const RemixUiHomeTab = (props: RemixUiHomeTabProps) => {
  const { plugin } = props;

  const [state, setState] = useState<{
    themeQuality: { filter: string; name: string };
  }>({
    themeQuality: themes.light,
  });

  useEffect(() => {
    plugin.call("theme", "currentTheme").then((theme) => {
      // update theme quality. To be used for for images
      setState((prevState) => {
        return {
          ...prevState,
          themeQuality: theme.quality === "dark" ? themes.dark : themes.light,
        };
      });
    });
    plugin.on("theme", "themeChanged", (theme) => {
      // update theme quality. To be used for for images
      setState((prevState) => {
        return {
          ...prevState,
          themeQuality: theme.quality === "dark" ? themes.dark : themes.light,
        };
      });
    });
  }, []);

  return (
    <div className="d-flex flex-row w-100" data-id="remixUIHTAll">
      <ThemeContext.Provider value={state.themeQuality}>
        <div
          className="px-2 pl-3 justify-content-start d-flex border-right flex-column"
          id="remixUIHTLeft"
          style={{ flex: 2, minWidth: "35%" }}
        >
          <HomeTabFile plugin={plugin} />
        </div>
        <div
          className="p-4 justify-content-start d-flex flex-column"
          style={{ width: "65%" }}
          id="remixUIHTRight"
        >
          <h1>Overview</h1>
          <p>Thank you for your early interest in AltLayer!</p>
          <p>
            As we continue to work on our solutions and explore means of
            collaboration, we’ve created a test environment for all you
            brilliant devs out there, so you can get a first-hand experience of
            using our Flash Layering technology.
          </p>
        </div>
      </ThemeContext.Provider>
    </div>
  );
};

export default RemixUiHomeTab;
