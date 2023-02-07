import React from "react" // eslint-disable-line
// import { erc20 } from '../core'

const WizardUI = () => {
  const generate = () => {
    // const contract = erc20.print()

    // console.log(contract);

  }

  return (<div>
    <section className="controls-section">
  <h1>Settings</h1>

    <div className="grid grid-cols-[2fr,1fr] gap-2">
      <label className="labeled-input">
        <span>Name</span>
        <input  />
      </label>

      <label className="labeled-input">
        <span>Symbol</span>
        <input />
      </label>
    </div>

    <label className="labeled-input">
      <span className="flex justify-between pr-2">
        Premint
      </span>
      <input type='button' name='test' value='Generate' onClick={generate} />
    </label>
    </section>
  </div>)
}

export default WizardUI
