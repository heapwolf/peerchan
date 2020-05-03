const screen = require('charm')()
const clipboardy = require('clipboardy')
const readline = require('readline')
const pkg = require('../package.json')
const os = require('os')
const path = require('path')
const fs = require('fs')

screen.pipe(process.stdout)
screen.reset()

screen.erase('screen')

let config = {
  bg: 255,
  fg: 238,
  comment: {
    fg: 244,
    bg: 255
  },
  timestamp: {
    fg: 250,
    bg: 255
  },
  prompt: {
    fg: 15,
    bg: 238
  },
  status: {
    fg: 15,
    bg: 248
  },
  scrollback: 3,
  bufferSize: 5000
}

const colorKeys = {}
let paintCursorOffset = 0
let readyBounce = null
let status = ''

const buffer = [
  { txt: 'Hello. Try /help', status: 'OK' }
]

const write = (o) => {
  paintCursorOffset = 0

  if (o.id) {
    const existing = buffer.find(line => line.id === o.id)

    if (existing) {
      existing.txt = o.txt
      return
    }
  }

  buffer.unshift(o)

  if (buffer.length === config.bufferSize) {
    buffer.pop()
  }
}

const setBackground = () => {
  screen.position(0, process.stdout.rows)
  screen.background(config.bg)
  screen.foreground(config.fg)
}

const setPrompt = () => {
  setBackground()
  screen.background(config.prompt.bg)
  screen.foreground(config.prompt.fg)
  screen.write(' '.repeat(process.stdout.columns))
  screen.position(0, process.stdout.rows)
}

const exit = () => {
  screen.reset()
  process.exit(0)
}

const help = () => {
  const mod = process.platform === 'darwin' ? 'Fn' : 'Shift'

  const help = [
    '',
    'KEYS',
    '',
    '- Up and Down arrows to navigate command history',
    `- ${mod}+Up and ${mod}+Down arrows to scroll buffer`,
    '- Tab to complete commmand',
    '',
    'COMMANDS',
    '',
    '/a <name> <hash>     accept invite',
    '/create [name]       create a channel',
    '/exit                leave',
    '/help                this info',
    '/id [name]           identify or list identities',
    '/join [name]         join or list channels',
    '/r                   request invite',
    '/status              status',
    ''
  ]

  help.forEach(txt => write({ txt }))
}

let completions = []

function completer (line) {
  const base = '/a /config /exit /help /id /join /q /r'.split(' ')
  const hits = [...base, ...completions].filter((c) => c.startsWith(line))
  return [hits.length ? hits : completions, line]
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  removeHistoryDuplicates: true,
  prompt: '',
  completer
})

const paintRows = () => {
  screen.background(config.bg)
  screen.foreground(config.fg)
  screen.erase('screen')

  const height = process.stdout.rows - 1
  let index = paintCursorOffset

  for (let i = height; i > 0; i--) {
    screen.position(0, i)

    if (i === 1) {
      const cols = process.stdout.columns

      screen.background(config.status.bg)
      screen.foreground(config.status.fg)
      screen.write(' '.repeat(cols))
      screen.position(0, 0)
      const padding = ' '.repeat((cols / 2) - (status.length / 2))
      screen.write(padding + status)
      screen.background(config.bg)
      screen.foreground(config.fg)
      return
    }

    const line = buffer[index++]
    if (!line) continue

    const calcCost = s => {
      const cost = Math.ceil(s.length / process.stdout.columns)

      if (cost > 1) {
        i -= cost
        screen.position(0, i)
      }
    }

    if (line.type !== 'message') {
      screen.background(config.comment.bg)
      screen.foreground(config.comment.fg)
      screen.write(config.prefix || '▍')
      screen.foreground(line.status === 'OK' ? 2 : 1)
      screen.write(line.status ? line.status + ' ' : '')
      screen.background(config.comment.bg)
      screen.foreground(config.comment.fg)

      calcCost(line.txt)

      screen.write(String(line.txt) || '')
    } else {
      let text
      if (line.value.isRoot) {
        text = 'channel created'
      } else {
        text = line.value.json.text
      }

      const time = new Date(line.value.timestamp * 1000).toLocaleTimeString()
      const { publicKeys, displayPath } = line.value.getAuthor(line.channel)
      // const author = displayPath.join('/')
      const author = displayPath.pop()
      const prefix = author || `<${line.channel}>`
      let color = 4

      if (publicKeys.length) {
        const key = publicKeys[publicKeys.length - 1].toString('hex')
        color = colorKeys[key]

        if (!color) {
          const index = Object.keys(colorKeys).length + publicKeys.length
          color = colorKeys[key] = index + 1
        }
      }

      calcCost(text)

      screen.foreground(config.timestamp.fg)
      screen.background(config.timestamp.bg)
      screen.write(time)
      screen.background(config.bg)
      screen.foreground(color)
      screen.write(' ' + prefix + ' ')
      screen.foreground(config.fg)
      screen.write(text)
    }
  }
}

const historyDown = () => {
  if (paintCursorOffset > 0) {
    paintCursorOffset -= config.scrollback
    ready()
  }
}

const historyUp = () => {
  paintCursorOffset += config.scrollback
  ready()
}

const ready = () => {
  clearTimeout(readyBounce)
  readyBounce = setTimeout(() => {
    setBackground()
    paintRows()
    setPrompt()
  }, 16)
}

rl.on('SIGINT', () => {
  write({ txt: 'Use /exit to exit' })
  ready()
})

rl.on('close', exit)

process.stdout.on('resize', ready)

process.stdin.on('keypress', (c, k) => {
  if (!k) return

  const up = ((k.name === 'up') && k.shift) || (k.name === 'pageup')
  const down = ((k.name === 'down') && k.shift) || (k.name === 'pagedown')

  if (up) historyUp()
  if (down) historyDown()
})

module.exports = (events) => {
  status = `Peerchan ${pkg.version}`
  const loadConfig = () => {
    const src = path.join(os.homedir(), '.peerchan.json')

    try {
      const str = fs.readFileSync(src)
      config = {
        ...config,
        ...JSON.parse(str)
      }
    } catch (err) {
      events.emit('log', { status: 'NOT OK', txt: err.message })
    }

    events.emit('log', { status: 'OK', txt: 'Loaded config' })
    ready()
  }

  events.on('messages', (data) => {
    for (const value of data.lines) {
      write({
        type: 'message',
        id: value.hash,
        channel: data.channel.name,
        value
      })
    }

    ready()
  })

  events.on('log', (data) => {
    write(data)
    ready()
  })

  const logError = err => {
    err.stack.split('\n').map(line => write({ txt: line }))
    ready()
  }

  process.on('uncaughtException', logError)
  process.on('unhandledRejection', logError)

  events.on('network:channels', data => {
    write({ txt: '' })
    write({ txt: 'CHANNELS' })
    write({ txt: '' })

    completions = completions.filter(c => !c.includes('/join'))

    for (const channel of data) {
      completions.push(`/join ${channel}`)
      write({ txt: `${channel}` })
    }

    write({ txt: '' })
    ready()
  })

  events.on('network:identities', data => {
    write({ txt: '' })
    write({ txt: 'IDENTITIES' })
    write({ txt: '' })

    if (!data.length) {
      write({ txt: 'You have no identitiy. Use `/id coolusername`' })
      write({ txt: 'Use `/help` for more commands.' })
      write({ txt: '' })
      return
    }

    completions = completions.filter(c => !c.includes('/id'))

    for (const id of data) {
      completions.push(`/id ${id}`)
      write({ txt: `${id}` })
    }

    write({ txt: '' })
    ready()
  })

  events.on('network:join', ({ name }) => {
    status = name
    ready()
  })

  events.on('network:status', status => {
    if (!status.channelName) return

    write({ txt: '' })
    write({ txt: 'CHANNEL' })
    write({ txt: '' })
    write({ txt: `Channel: ${status.channelName}` })
    write({ txt: `Messages: ${status.messageCount}` })
    write({ txt: `Users: ${status.peerCount}` })
    write({ txt: '' })
    write({ txt: 'USERS' })
    write({ txt: '' })

    for (const user of status.peers) {
      write({ txt: `${user}` })
    }

    write({ txt: '' })
    ready()
  })

  events.on('network:request', data => {
    const cmd = `/a ${data.trusteeName} ${data.request58}`

    const msg = [
      '',
      'Ask peer to use this command (copied to clipboard)',
      '',
      cmd,
      ''
    ]

    clipboardy.writeSync(cmd)

    for (const txt of msg) {
      write({ txt })
    }
  })

  rl.on('line', (line) => {
    const text = line.trim()
    const isCommand = text[0] === '/' || text[0] === ':'

    if (isCommand) {
      const parts = text.slice(1).split(' ')

      switch (parts[0]) {
        case '?':
        case 'h':
        case 'help':
          help()
          ready()
          break
        case 'create': {
          const name = parts[1]
          if (!name) break
          events.emit('network', 'create', { name })
          break
        }
        case 'q':
        case 'exit':
          write({ txt: 'Exiting...', status: 'OK' })
          events.emit('network', 'post', { text: '<exited>' })
          setTimeout(exit, 1024)
          break
        case 'r':
          events.emit('network', 'request')
          ready()
          break
        case 'a': {
          events.emit('network', 'accept', {
            inviteeName: parts[1].replace(/"/g, ''),
            request: parts[2].replace(/"/g, '')
          })
          break
        }
        case 'status':
          events.emit('network', 'status')
          break
        case 'config':
          loadConfig()
          break
        case 'join': {
          if (!parts[1]) {
            events.emit('network', 'channels')
            break
          }

          events.emit('network', 'ch', {
            name: parts[1]
          })

          break
        }

        case 'id': {
          if (!parts[1]) {
            events.emit('network', 'identities')
            break
          }

          events.emit('network', 'iam', {
            name: parts[1]
          })

          break
        }
      }

      ready()
      return
    }

    if (!text) {
      ready()
      return
    }

    events.emit('network', 'post', { text })

    ready()
    rl.prompt(true)
  })

  events.on('network:initialized', () => {
    if (config.id) {
      events.emit('network', 'iam', { name: config.id })
    }
  })

  loadConfig()
  rl.prompt(true)
  ready()
}
