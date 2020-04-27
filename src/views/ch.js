const blessed = require('neo-blessed')

module.exports = class WindowChannels {
  constructor (screen, events) {
    this.screen = screen
    this.events = events

    this.win = blessed.box({
      parent: screen,
      shadow: true,
      hidden: true,
      mouse: true,
      keys: true,
      scrollable: true,
      scrollbar: true,
      left: 'center',
      top: 'center',
      width: '50%',
      height: '50%',
      title: 'Channels',
      style: {
        fg: 'black',
        selected: {
          fg: 'white',
          bg: 'black'
        }
      },
      border: 'line',
      draggable: true,
      tags: true
    })

    events.on('network:channels', data => {
      if (!data || !data.length) {
        this.win.show()
        screen.render()
        return
      }

      events.emit('log', {
        level: 'info',
        message: `Found ${data.length} channels`
      })

      this.win.show()
      this.win.setItems(data)
      this.win.pick((err, name) => {
        if (err) {
          return events.emit('log', {
            level: 'error',
            message: err.message
          })
        }

        events.emit('network', 'cd', { name })
      })

      screen.render()
    })
  }
}
