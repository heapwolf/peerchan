import blessed from 'neo-blessed'

export default class WindowError {
  constructor (screen, events) {
    this.screen = screen
    this.events = events

    this.win = blessed.box({
      parent: this.screen,
      shadow: true,
      hidden: true,
      mouse: true,
      keys: true,
      left: 'center',
      top: 'center',
      width: '50%',
      height: '50%',
      padding: 1,
      style: {
        fg: 'black'
      },
      label: {
        text: ' ERROR ',
        top: 0,
        left: 0
      },
      border: 'line',
      draggable: true,
      tags: true
    })

    this.text = blessed.box({
      parent: this.win,
      top: 0,
      left: 0,
      right: 0,
      bottom: 4,
      scrollable: true,
      scrollbar: {
        bg: 'black'
      }
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

    function errHandle (err) {
      process.nextTick(() => {
        this.win.show()
        this.win.setContent(err.message)
        this.screen.render()
      })
    }

    events.on('error', errHandle)

    process.on('uncaughtException', errHandle)
    process.on('unhandledRejection', errHandle)
  }

  render (s = '') {
    this.text.setContent(s)
  }

  hide () {
    this.win.hide()
    this.screen.render()
  }
}
