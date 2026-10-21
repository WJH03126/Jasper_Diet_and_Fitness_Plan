const logger = require('./logger.js')

const STORES = {
  USER_INFO: 'local_user_info',
  DIET_RECORDS: 'local_diet_records',
  FITNESS_RECORDS: 'local_fitness_records',
  FITNESS_PLANS: 'local_fitness_plans',
  PLAN_TEMPLATES: 'local_plan_templates',
  WEIGHT_RECORDS: 'local_weight_records',
  SUBSCRIBE_MSGS: 'local_subscribe_msgs'
}

const STORE_DATE_FIELD = {
  DIET_RECORDS: 'record_date',
  FITNESS_RECORDS: 'record_date',
  FITNESS_PLANS: 'plan_date',
  WEIGHT_RECORDS: 'record_date'
}

const CLOUD_COLLECTIONS = {
  DIET_RECORDS: 'diet_record',
  FITNESS_RECORDS: 'fitness_record',
  FITNESS_PLANS: 'fitness_plan',
  WEIGHT_RECORDS: 'weight_record'
}

function getAll(key) {
  try { return wx.getStorageSync(key) || [] } catch (e) { return [] }
}

function setAll(key, arr) {
  try { wx.setStorageSync(key, arr) } catch (e) {}
}

function add(key, record) {
  const arr = getAll(key)
  arr.push(record)
  setAll(key, arr)
  return record
}

function remove(key, idField, idValue) {
  const arr = getAll(key)
  const filtered = arr.filter(r => r[idField] !== idValue)
  setAll(key, filtered)
  return arr.length - filtered.length
}

function update(key, idField, idValue, patch) {
  const arr = getAll(key)
  const found = arr.find(r => r[idField] === idValue)
  if (found) {
    Object.assign(found, patch)
    setAll(key, arr)
    return true
  }
  return false
}

function query(key, cond) {
  const arr = getAll(key)
  if (!cond) return arr
  return arr.filter(r => Object.keys(cond).every(k => r[k] === cond[k]))
}

function queryByDate(key, dateStr) {
  const arr = getAll(key)
  return arr.filter(r => {
    if (!r.record_date) return false
    return r.record_date.slice(0, 10) === dateStr.slice(0, 10)
  })
}

function sortBy(arr, field, desc = false) {
  return [...arr].sort((a, b) => {
    const va = a[field], vb = b[field]
    if (va == null) return 1
    if (vb == null) return -1
    return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1)
  })
}

function _parseDate(v) {
  if (!v) return null
  if (typeof v === 'string') {
    const s = v.slice(0, 10)
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
  if (v instanceof Date) return v
  return null
}

async function cleanupOldRecords(maxDays, cloudReady) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const stats = {}

  Object.keys(STORE_DATE_FIELD).forEach(storeKey => {
    const storageKey = STORES[storeKey]
    const dateField = STORE_DATE_FIELD[storeKey]
    const arr = getAll(storageKey)
    if (!arr.length) { stats[storeKey] = { localKept: 0, localRemoved: 0, cloudRemoved: 0 }; return }

    const kept = arr.filter(r => {
      const v = r[dateField]
      if (!v) return true
      const str = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10)
      return str >= cutoffStr
    })

    const removed = arr.length - kept.length
    if (removed > 0) {
      try { wx.setStorageSync(storageKey, kept) } catch (e) {
        logger.warn('[local-store] cleanupOldRecords write fail', storeKey, e && e.message)
      }
    }
    stats[storeKey] = { localKept: kept.length, localRemoved: removed, cloudRemoved: 0 }
    logger.info('[local-store] cleanup', storeKey, 'cutoff=', cutoffStr, 'kept=', kept.length, 'removed=', removed)
  })

  let cloudStats = {}
  try {
    cloudStats = await cleanupOldRecordsCloud(cutoffStr, cloudReady)
    Object.keys(cloudStats).forEach(k => {
      if (stats[k]) stats[k].cloudRemoved = cloudStats[k]
    })
  } catch (err) {
    logger.warn('[local-store] cleanupOldRecordsCloud fail', err && err.message)
  }

  return stats
}

async function cleanupOldRecordsCloud(cutoffStr, cloudReady) {
  if (!cloudReady) { logger.info('[local-store] cleanupCloud skip: cloud not ready'); return {} }
  const openid = wx.getStorageSync('openid')
  if (!openid) { logger.info('[local-store] cleanupCloud skip: no openid'); return {} }

  let db = null
  try { db = wx.cloud.database() } catch (e) { logger.info('[local-store] cleanupCloud skip: no cloud'); return {} }

  const stats = {}
  const cutoff = new Date(cutoffStr + 'T00:00:00')
  if (isNaN(cutoff.getTime())) { logger.warn('[local-store] cleanupCloud invalid cutoff'); return {} }

  for (const storeKey of Object.keys(STORE_DATE_FIELD)) {
    const collName = CLOUD_COLLECTIONS[storeKey]
    const dateField = STORE_DATE_FIELD[storeKey]
    if (!collName) continue

    try {
      const queryRes = await db.collection(collName)
        .where({ openid: openid || '' })
        .limit(1000)
        .get()

      const toRemove = (queryRes.data || []).filter(r => {
        const d = _parseDate(r[dateField])
        if (!d) return false
        return d.getTime() < cutoff.getTime()
      })

      let removedCount = 0
      for (const r of toRemove) {
        try {
          await db.collection(collName).doc(r._id).remove()
          removedCount++
        } catch (e) { logger.warn('[local-store] cleanupCloud remove fail', collName, r._id, e.message) }
      }
      stats[storeKey] = removedCount
      logger.info('[local-store] cleanupCloud', collName, 'cutoff=', cutoffStr, 'scan=', (queryRes.data || []).length, 'removed=', removedCount)
    } catch (err) {
      const msg = (err && (err.errMsg || err.message)) || ''
      if (msg.includes('Environment not found') || msg.includes('no default environment')) {
        logger.info('[local-store] cleanupCloud skip: cloud env not configured')
        return {}
      }
      logger.warn('[local-store] cleanupCloud scan fail', collName, msg)
      stats[storeKey] = 0
    }
  }

  return stats
}

module.exports = {
  STORES,
  getAll,
  setAll,
  add,
  remove,
  update,
  query,
  queryByDate,
  sortBy,
  cleanupOldRecords
}
