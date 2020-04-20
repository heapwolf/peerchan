import os from 'os'
import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

import blessed from 'neo-blessed'

import Network from './network.js'
import log from './log.js'
import ui from './ui.js'
import Storage from '@peerlinks/sqlite-storage'

//
// Create the network
//
const USER_DATA_DIR = path.join(os.homedir(), '.peerchan')

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR)
}

const DB_FILE = path.join(USER_DATA_DIR, 'pl-db-v2.sqlite')
const ee = new EventEmitter()

//
// Create a screen object, pass it the emitter
//
const screen = blessed.screen({
  smartCSR: true
})

screen.title = 'Peerchan'

ui(screen, ee)
log(ee)

//
// Startup
//
export default async function main () {
  const instance = process.env.INST || 0

  log.info('Storage initializing...')
  const storage = new Storage({
    file: `chat-instance${instance}.sqlite`,
    trace: !!process.env.PEERLINKS_TRACE_DB
  })

  log.info('Storage opening...')
  await storage.open()
  log.info('Storage opened')

  const network = new Network(ee, {
    db: DB_FILE,
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
