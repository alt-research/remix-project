import { PluginViewWrapper } from '@remix-ui/helper'
import { ViewPlugin } from '@remixproject/engine-web'
import React from 'react' // eslint-disable-line
import * as packageJson from '../../../../../package.json'

const profile = {
  name: 'generate',
  displayName: 'Generate Contracts',
  methods: ['get'],
  events: [],
  icon: 'assets/img/swarm.webp',
  description: 'Wizard Generate settings',
  kind: 'generate',
  location: 'sidePanel',
  documentation: '',
  version: packageJson.version,
  permission: true
}


export class GenerateTab extends ViewPlugin {

  constructor() {
    super(profile)
  }

  render() {
    return (
      <div id='generateTab'>
        <PluginViewWrapper plugin={this} />
      </div>
    )
  }
}
