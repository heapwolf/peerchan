const screen = require('charm')()
const readline = require('readline')
const pkg = require('../package.json')

screen.pipe(process.stdout)
screen.reset()

screen.erase('screen')

const BUFFER_MAX_LINES = 5000

const buffer = [
  `peerchan ${pkg.version}`
]

const writeToBuffer = (s) => {
  buffer.unshift(s)

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
    ' /help                this info',
    ' /exit                leave',
    ' /id <name>           identify',
    ' /join <name>         join channel',
    ' /a <name> <hash>     accept invite',
    ' /r                   request invite',
    ''
  ].forEach(writeToBuffer)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ''
})

const paintRows = () => {
  screen.background(255)
  screen.foreground(238)
  screen.erase('screen')

  const height = process.stdout.rows - 1
  let index = 0

  for (let i = height; i > 0; i--) {
    screen.position(0, i)

    const line = buffer[index++] || ''

    if (line[0] === '#') {
      screen.foreground(4)
    } else {
      screen.foreground(238)
    }
    screen.write(line)
  }
}

const fmtMessage = (data, channel) => {
  if (data.system) return

  const { displayPath } = data.getAuthor(channel)
  const time = new Date(data.timestamp * 1000).toLocaleTimeString()
  const author = displayPath.join('/')

  let text
  if (data.isRoot) {
    text = '<root>'
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

const ready = () => {
  paintRows()
  setPrompt()
}

rl.on('close', exit)

process.stdout.on('resize', ready)

process.stdin.on('keypress', (c, k) => {
  // if (k && k.name === 'up') historyUp()
  // if (k && k.name === 'down') historyDown()
  // if (k && k.name === 'tab') tab()
})

module.exports = (events) => {
  events.on('messages', (data) => {
    for (const line of data.lines) {
      writeToBuffer(fmtMessage(line, data.channel.name))
    }

    ready()
  })

  events.on('log', (data) => {
    writeToBuffer(`# ${data.message}`)
    ready()
  })

  events.on('network:channels', data => {
    writeToBuffer('')

    for (const channel of data) {
      writeToBuffer(`# +${channel}`)
    }
    ready()
  })

  events.on('network:request', data => {
    const msg = [
      'Ask peer to use this command',
      '',
      `/a ${data.trusteeName} ${data.request58}`,
      ''
    ]

    for (const part of msg) {
      writeToBuffer(part)
    }
  })

  rl.on('line', (line) => {
    const text = line.trim()
    const isCommand = text[0] === '/' || text[0] === ':'

    if (isCommand) {
      const parts = text.slice(1).split(' ')

      switch (parts[0]) {
        case 'help':
          help()
          ready()
          break
        case 'exit':
          events.emit('network', 'post', { text: '*exited*' })
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

        case '':
          ready()
          break
      }
      return
    }

    if (!text) {
      ready()
      return
    }

    writeToBuffer(line)
    events.emit('network', 'post', { text })

    ready()
    rl.prompt()
  })

  rl.prompt()
  ready()
  ready()
}
