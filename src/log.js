const log = ee => {
  log.emit = (...args) => ee.emit('log', ...args)
}

log.info = (...args) => log.emit({ status: 'OK', txt: args })
log.error = (...args) => log.emit({ status: 'NOT OK', txt: args })
log.warn = (...args) => log.emit({ status: 'WARN', txt: args })

module.exports = log
