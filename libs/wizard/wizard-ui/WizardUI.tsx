import React, { useRef } from "react" // eslint-disable-line
import { erc20 } from '../core/src/index'
import './main.css'
import { SaveData } from "./types/wizard"


interface WizardUIProps {
  onSave: (data: SaveData) => void
}

const WizardUI = ({ onSave }: WizardUIProps) => {
  const nameRef = useRef<HTMLInputElement>(null)

  const generate = () => {
    const name = nameRef.current.value
    const contract = erc20.print({
      name: name,
      symbol: ""
    })

    onSave({
      name,
      data: contract
    })
  }

  return (<div>
    <section className="controls-section">
  <h1>Settings</h1>

    <div className="grid grid-cols-[2fr,1fr] gap-2">
      <label className="labeled-input">
        <span>File Name</span>
        <input name="name" ref={nameRef} />
      </label>
    </div>

    <label className="labeled-input">
      <span className="flex justify-between pr-2">
        Generate
      </span>
      <input className='generateBtn' type='button' name='test' value='Generate' onClick={generate} />
    </label>
    </section>
  </div>)
}

export default WizardUI
