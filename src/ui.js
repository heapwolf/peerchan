const screen = require('charm')()
const readline = require('readline')
const pkg = require('../package.json')

screen.pipe(process.stdout)
screen.reset()

screen.erase('screen')

const BUFFER_MAX_LINES = 5000
let paintCursorOffset = 0

const buffer = [
  { txt: `Hello Peerchan ${pkg.version}`, status: 'OK' }
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

  if (buffer.length === BUFFER_MAX_LINES) {
    buffer.pop()
  }
}

const setPrompt = () => {
  screen.position(0, process.stdout.rows)
  screen.background(238)
  screen.foreground(255)
  screen.write(' '.repeat(process.stdout.columns))
  screen.position(0, process.stdout.rows)
}

const exit = () => {
  screen.reset()
  process.exit(0)
}

const help = () => {
  [
    '',
    'KEYS',
    '',
    'Up and Down arrows to navigate command history',
    'Shift+Up and Shift+Down arrows to scroll buffer',
    'Tab to complete commmand',
    '',
    'COMMANDS',
    '',
    '/help                this info',
    '/exit                leave',
    '/id [name]           identify or list identities',
    '/join [name]         join or list channels',
    '/a <name> <hash>     accept invite',
    '/r                   request invite',
    ''
  ].forEach(txt => write({ txt }))
}

let completions = []

function completer (line) {
  const base = '/a /exit /help /id /join /q /r'.split(' ')
  const hits = [...base, ...completions].filter((c) => c.startsWith(line))
  return [hits.length ? hits : completions, line]
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '',
  completer
})

const paintRows = () => {
  screen.background(255)
  screen.foreground(238)
  screen.erase('screen')

  const height = process.stdout.rows - 1
  let index = paintCursorOffset

  for (let i = height; i > 0; i--) {
    screen.position(0, i)

    const line = buffer[index++]
    if (!line) continue

    if (line.type !== 'message') {
      screen.foreground(4)
      screen.write('# ')
      screen.foreground(line.status === 'OK' ? 2 : 1)
      screen.write(line.status ? line.status + ' ' : '')
      screen.foreground(4)
      screen.write(String(line.txt) || '')
    } else {
      screen.foreground(238)
      screen.write(line.txt || '')
    }
  }
}

const fmtMessage = (data, channel) => {
  const { displayPath } = data.getAuthor(channel)
  const time = new Date(data.timestamp * 1000).toLocaleTimeString()
  const author = displayPath.join('/')

  let text
  if (data.isRoot) {
    text = '<channel created>'
  } else {
    text = data.json.text
  }

  let prefix = ''
  if (author) {
    prefix = `│ ${author}:`
  } else {
    prefix = `· ${channel}`
  }

  return `${time} ${prefix} ${text}`
}

const historyDown = () => {
  if (paintCursorOffset > 0) {
    paintCursorOffset--
    ready()
  }
}

const historyUp = () => {
  paintCursorOffset++
  ready()
}

const ready = () => {
  paintRows()
  setPrompt()
}

rl.on('close', exit)

process.stdout.on('resize', ready)

process.stdin.on('keypress', (c, k) => {
  if (k && k.name === 'up' && k.shift) historyUp()
  if (k && k.name === 'down' && k.shift) historyDown()
  // if (k && k.name === 'tab') tab()
})

module.exports = (events) => {
  events.on('messages', (data) => {
    for (const line of data.lines) {
      write({
        txt: fmtMessage(line, data.channel.name),
        type: 'message',
        id: line.hash
      })
    }

    ready()
  })

  events.on('log', (data) => {
    write(data)
    ready()
  })

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
      write({ txt: 'You have no identitiy. Use /id coolusername' })
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

  events.on('network:identified', () => {
    events.emit('network', 'channels')
  })

  events.on('network:request', data => {
    const msg = [
      '',
      'Ask peer to use this command',
      '',
      `/a ${data.trusteeName} ${data.request58}`,
      ''
    ]

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
        case 'a':
          events.emit('network', 'accept', {
            inviteeName: parts[1].replace(/"/g, ''),
            request: parts[2].replace(/"/g, '')
          })
          break
        case 'ch':
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
    rl.prompt()
  })

  events.emit('network', 'identities')

  rl.prompt()
  ready()
  ready()
}
