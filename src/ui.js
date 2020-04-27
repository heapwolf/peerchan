const blessed = require('neo-blessed')
const WindowHelp = require('./views/help')
const WindowError = require('./views/error')
const WindowInvite = require('./views/invite')
const WindowLogs = require('./views/logs')
const WindowIdentity = require('./views/id')
const WindowChannels = require('./views/ch')

function rgbToHex (...args) {
  const toHex = c => {
    const hex = c.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return args.map(toHex).join('')
}

function fmtMessage (data, channel) {
  if (data.system) return

  let { publicKeys, displayPath } = data.getAuthor(channel)

  displayPath = displayPath.map((name, i) => {
    // Make last element of path bold
    if (i === displayPath.length - 1) {
      name = `{bold}${name}{/bold}`
    }

    // Colorize peers by key
    const [r, g, b] = publicKeys[i].slice(0, 3)
    name = `{#${rgbToHex(r, g, b)}-fg}${name}{/}`

    return name
  })

  const time = new Date(data.timestamp * 1000).toLocaleTimeString()
  const author = displayPath.join('>')

  let text
  if (data.isRoot) {
    text = '<root>'
  } else {
    text = data.json.text
  }

  // (${data.height})
  return `${time} [${author || 'me'}]: ${text}`
}

module.exports = (screen, events) => {
  //
  // MESSAGES
  //
  const winMessages = blessed.box({
    parent: screen,
    mouse: true,
    scrollable: true,
    scrollbar: true,
    left: 0,
    top: 0,
    right: 0,
    bottom: 1,
    style: {
      fg: 'black',
      bg: 'white'
    },
    tags: true
  })

  const textarea = blessed.textarea({
    parent: screen,
    bottom: 0,
    keys: true,
    mouse: true,
    height: 1,
    left: 0,
    right: 0,
    inputOnFocus: true,
    style: {
      bg: 'blue',
      fg: 'white'
    },
    tags: false,
    index: 10
  })

  textarea.key('enter', (ch, key) => {
    const text = textarea.getValue().trim()
    if (!text) return

    textarea.clearValue()

    if (text[0] === '/' || text[0] === ':') {
      return parseCommand(text.slice(1))
    }

    events.emit('network', 'post', { text })
  })

  const windowHelp = new WindowHelp(screen, events)
  windowHelp.render()

  const windowError = new WindowError(screen, events)
  windowError.render()

  const windowInvite = new WindowInvite(screen, events)
  if (!windowInvite) throw new Error('ENOINVITEWIN')

  const windowLogs = new WindowLogs(screen, events)
  if (!windowLogs) throw new Error('ENOLOGSWIN')

  // const windowIdentity = new WindowIdentity(screen, events)
  // if (!windowIdentity) throw new Error('ENOIDSWIN')

  // const windowChannels = new WindowChannels(screen, events)
  // if (!windowChannels) throw new Error('ENOCHWIN')

  events.on('messages', (data) => {
    const w = winMessages
    const str = []

    for (const line of data.lines) {
      str.push(fmtMessage(line))
    }

    if (str.length) {
      w.setContent(str.join('\n'))
      w.scrollTo(w.getScrollHeight())
    }

    screen.render()
  })

  events.on('message', (data) => {
    if (!data) return
    const w = winMessages

    w.insertBottom([fmtMessage(data)])
    w.scrollTo(w.getScrollHeight())
    screen.render()
  })

  function parseCommand (val) {
    const parts = val.split(' ')

    switch (parts[0]) {
      case 'l':
      case 'logs':
        return windowLogs.toggle()
      case 'r':
      case 'request': {
        events.emit('network', 'request')
        break
      }
      case 'a':
      case 'accept': {
        events.emit('network', 'accept', {
          inviteeName: parts[1].replace(/"/g, ''),
          request: parts[2].replace(/"/g, '')
        })
        break
      }
      case 'ch': {
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
      case '?':
      case 'h':
      case 'help':
        return windowHelp.show()
      case 'quit':
      case 'q':
      case 'exit':
        return events.emit('quit')
    }
  }

  screen.key(['C-q'], () => {
    events.emit('quit')
  })

  screen.render()
}
