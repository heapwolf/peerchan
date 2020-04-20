import blessed from 'neo-blessed'

export default class WindowLogs {
  constructor (screen, events) {
    this.screen = screen
    this.events = events

    this.win = blessed.box({
      parent: screen,
      shadow: true,
      hidden: true,
      mouse: true,
      scrollable: true,
      scrollbar: true,
      left: 'center',
      top: 'center',
      width: '70%',
      height: '70%',
      style: {
        fg: 'black'
      },
      label: {
        text: ' LOGS ',
        top: 0,
        left: 0
      },
      border: 'line',
      draggable: true,
      tags: true
    })

    events.on('log', data => {
      if (!data) return
      this.win.insertBottom([this.fmtLog(data)])
      this.win.scrollTo(this.win.getScrollHeight())
      screen.render()
    })
  }

  fmtLog (data) {
    if (!data.level || !data.message) {
      return JSON.stringify(data) // arbitrary log message
    }

    return `{bold}${data.level.toUpperCase()}{/bold} ${data.message}`
  }

  show () {
    this.win.show()
    this.screen.render()
  }

  hide () {
    this.win.hide()
    this.screen.render()
  }

  toggle () {
    this.win.toggle()
    this.screen.render()
  }
}
