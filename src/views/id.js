import blessed from 'neo-blessed'

export default class WindowIdentity {
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

    this.winIdCreate = blessed.box({
      parent: screen,
      shadow: true,
      hidden: true,
      mouse: true,
      left: 'center',
      top: 'center',
      width: '50%',
      content: 'Please provide a name',
      padding: 1,
      height: 10,
      style: {
        fg: 'black'
      },
      border: 'line',
      draggable: true
    })

    const winIdCreateButton = blessed.button({
      parent: this.winIdCreate,
      mouse: true,
      right: 0,
      bottom: 0,
      width: 4,
      height: 1,
      style: {
        fg: 'white',
        bg: 'black'
      },
      content: ' OK '
    })

    this.winIdCreateInput = blessed.textarea({
      parent: this.winIdCreate,
      top: 2,
      left: 0,
      mouse: true,
      right: 0,
      height: 1,
      inputOnFocus: true,
      style: {
        bg: 'blue',
        fg: 'white'
      }
    })

    const onAfterWinIdCreate = () => {
      this.winIdCreate.hide()
      screen.render()

      events.emit('network', 'iam', {
        name: this.winIdCreateInput.getValue().trim()
      })
      // this.events.emit('input:focus')
    }

    this.winIdCreateInput.key('enter', onAfterWinIdCreate)
    winIdCreateButton.on('click', onAfterWinIdCreate)

    events.on('network:identities', data => {
      this.show(data)
    })
  }

  show (data) {
    if (!data || !data.length) {
      this.winIdCreate.show()
      this.winIdCreateInput.focus()
      this.screen.render()
      return
    }

    this.events.emit('log', {
      level: 'info',
      message: `Found ${data.length} identities`
    })

    this.win.show()
    this.win.setItems(data)
    this.win.pick((err, name) => {
      if (err) {
        return this.events.emit('log', {
          level: 'error',
          message: err.message
        })
      }

      this.events.emit('network', 'iam', { name })
      // this.events.emit('input:focus')
    })

    this.screen.render()
  }
}
