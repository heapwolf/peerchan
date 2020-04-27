const os = require('os')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

const blessed = require('neo-blessed')

const Network = require('./network')
const log = require('./log')
const ui = require('./ui')
const Storage = require('@peerlinks/level-storage')

//
// Create the network
//
const USER_DATA_DIR = path.join(os.homedir(), '.peerchan')

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR)
}

const ee = new EventEmitter()

//
// Create a screen object, pass it the emitter
//
const screen = blessed.screen({
  smartCSR: true
})

//
// Startup
//
module.exports = async function main () {
  const instance = process.env.INST || 0

  ui(screen, ee)
  log(ee)

  log.info('Storage initializing...')
  const storage = new Storage()

  log.info('Storage opening...')
  await storage.open(`./data-${instance}.level`)
  log.info('Storage opened')

  const network = new Network(ee, {
    storage,
    log
  })

  ee.on('quit', async () => {
    log.info('Quitting...')
    await storage.close()
    process.exit(0)
  })

  try {
    log.info('Network initializing...')
    await network.init()
  } catch (err) {
    log.error(err.stack)
    process.exit(1)
  }

  ee.emit('network', 'identities')
  log.info('Network initialized...')
}