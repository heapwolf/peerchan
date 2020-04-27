const blessed = require('neo-blessed')
const clipboardy = require('clipboardy')

module.exports = class WindowInvite {
  constructor (screen, events) {
    this.screen = screen
    this.events = events

    this.win = blessed.box({
      parent: screen,
      shadow: true,
      hidden: true,
      mouse: true,
      left: 'center',
      top: 'center',
      width: '70%',
      height: 15,
      style: {
        fg: 'black'
      },
      padding: 1,
      border: 'line',
      draggable: true,
      tags: true
    })

    const winInvitesCopyButton = blessed.button({
      parent: this.win,
      mouse: true,
      keys: true,
      right: 10,
      bottom: 0,
      height: 1,
      width: 6,
      style: {
        fg: 'white',
        bg: 'black'
      },
      content: ' COPY ',
      index: 100
    })

    let currentInvite

    winInvitesCopyButton.on('click', () => {
      const {
        trusteeName: name,
        request58: id
      } = currentInvite

      const s = `/a ${name} ${id}`
      clipboardy.writeSync(s)
      this.win.close()
      this.screen.render()
    })

    const winInvitesCloseButton = blessed.button({
      parent: this.win,
      mouse: true,
      right: 0,
      bottom: 0,
      width: 7,
      height: 1,
      style: {
        fg: 'white',
        bg: 'black'
      },
      content: ' CLOSE '
    })

    winInvitesCloseButton.on('click', () => {
      this.hide()
    })

    events.on('network:request', data => {
      this.render(data)
      this.show()
    })
  }

  render (data) {
    this.currentInvite = data

    const message = [
      'Ask peer to use this one-time invite.',
      '',
      `username: {bold}${data.trusteeName}{/}`,
      '',
      `id: {bold}${data.request58}{/}`
    ]

    this.win.setContent(message.join('\n'))
  }

  show () {
    this.win.show()
    this.win.focus()
    this.screen.render()
  }

  hide () {
    this.win.hide()
    this.screen.render()
  }
}