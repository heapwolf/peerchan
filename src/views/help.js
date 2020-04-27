const blessed = require('neo-blessed')

module.exports = class WindowHelp {
  constructor (screen, events) {
    this.screen = screen
    this.events = events

    this.win = blessed.box({
      parent: screen,
      content: '',
      shadow: true,
      mouse: true,
      hidden: true,
      scrollable: true,
      scrollbar: true,
      left: 'center',
      top: 'center',
      padding: 1,
      width: 60,
      height: 16,
      style: {
        fg: 'black'
      },
      border: 'line',
      draggable: true,
      tags: true
    })

    this.button = blessed.button({
      parent: this.win,
      height: 1,
      width: 4,
      keys: true,
      content: ' OK ',
      left: 'center',
      bottom: 0,
      style: {
        fg: 'white',
        bg: 'black'
      }
    })

    this.button.on('click', () => {
      this.hide()
    })

    this.win.key('enter', () => {
      this.hide()
    })
  }

  render (version = '0.0.0') {
    const content = [
      '{underline}HELP{/underline}',
      `version ${version}`,
      '',
      '/help|?                     This message',
      '/id [id]                    Identify',
      '/ch [id]                    Change the channel',
      '/accept|a <user> <value>    Accept invite',
      '/request|r                  Request invite',
      '/logs|l                     Show technical logs',
      '/exit|quit|q                Quit the app'
    ].join('\n')

    this.win.setContent(content)
  }

  show () {
    this.win.show()
    this.button.focus()
    this.screen.render()
  }

  hide () {
    this.win.hide()
    this.screen.render()
  }
}
