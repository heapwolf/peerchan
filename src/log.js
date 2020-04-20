const log = ee => {
  log.emit = (...args) => ee.emit('log', ...args)
}

log.info = (...args) => log.emit({ level: 'info', message: args })
log.error = (...args) => log.emit({ level: 'error', message: args })
log.warn = (...args) => log.emit({ level: 'warn', message: args })

export default log
