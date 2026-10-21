const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR']

let currentLevel = LEVELS.DEBUG
const sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)

function formatTime(date) {
  const d = date || new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function formatArg(arg) {
  if (arg === null || arg === undefined) return String(arg)
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg, (k, v) => {
        if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack?.substr(0, 200) }
        if (v instanceof Date) return v.toISOString()
        if (v && v.errMsg) return { errMsg: v.errMsg, errCode: v.errCode }
        return v
      })
    } catch (e) {
      return String(arg)
    }
  }
  return String(arg)
}

function output(level, tag, args) {
  if (level < currentLevel) return
  const time = formatTime()
  const levelName = LEVEL_NAMES[level]
  const prefix = `[${time}] [${levelName}] [${sessionId}] [${tag}]`

  if (level === LEVELS.ERROR) {
    console.error(prefix, ...args.map(formatArg))
  } else if (level === LEVELS.WARN) {
    console.warn(prefix, ...args.map(formatArg))
  } else {
    console.log(prefix, ...args.map(formatArg))
  }
}

const logger = {
  setLevel(lvl) {
    if (typeof lvl === 'string') currentLevel = LEVELS[lvl] ?? LEVELS.DEBUG
    else currentLevel = lvl
  },
  debug(tag, ...args) { output(LEVELS.DEBUG, tag, args) },
  info(tag, ...args) { output(LEVELS.INFO, tag, args) },
  warn(tag, ...args) { output(LEVELS.WARN, tag, args) },
  error(tag, ...args) { output(LEVELS.ERROR, tag, args) },
  sessionId,
  newSession() {
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)
  }
}

module.exports = logger
