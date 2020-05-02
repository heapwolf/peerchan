const os = require('os')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

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
// Startup
//
module.exports = async function main () {
  const instance = process.env.INST || 0

  log(ee)
  ui(ee)

  const storage = new Storage()

  await storage.open(`./data-${instance}.level`)

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
    await network.init()
  } catch (err) {
    log.error(err.stack)
    process.exit(1)
  }

  ee.emit('network:initialized')
}
