const logger = require('./logger.js')

const STORES = {
  USER_INFO: 'userInfo',
  DIET_RECORDS: 'local_diet_records',
  FITNESS_RECORDS: 'local_fitness_records',
  FITNESS_PLANS: 'local_fitness_plans',
  PLAN_TEMPLATES: 'local_plan_templates',
  WEIGHT_RECORDS: 'local_weight_records',
  SUBSCRIBE_MSGS: 'local_subscribe_msgs',
  NUTRITION_TARGET: 'nutritionTarget',
  CUSTOM_FOODS: 'custom_foods',
  REMOVED_BUILTIN: 'removed_builtin_foods'
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
  WEIGHT_RECORDS: 'weight_record',
  PLAN_TEMPLATES: 'plan_template',
  CUSTOM_FOODS: 'custom_food',
  REMOVED_BUILTIN: 'user_pref'
}

function _privacyAllowed() {
  try { return wx.getStorageSync('privacy_agreed') === true } catch (e) { return false }
}

function _getOpenid() {
  try { return wx.getStorageSync('openid') || 'default' } catch (e) { return 'default' }
}

function _nsKey(baseKey) {
  return 'ns_' + _getOpenid() + '_' + baseKey
}

function getAll(key) {
  const nsKey = _nsKey(key)
  try { return wx.getStorageSync(nsKey) || [] } catch (e) { return [] }
}

function setAll(key, arr) {
  if (!_privacyAllowed()) { logger.warn('[local-store] setAll blocked: privacy not agreed'); return }
  const nsKey = _nsKey(key)
  try { wx.setStorageSync(nsKey, arr) } catch (e) {}
}

function add(key, record) {
  if (!_privacyAllowed()) { logger.warn('[local-store] add blocked: privacy not agreed'); return null }
  const arr = getAll(key)
  arr.push(record)
  setAll(key, arr)
  return record
}

function remove(key, idField, idValue) {
  if (!_privacyAllowed()) { logger.warn('[local-store] remove blocked: privacy not agreed'); return 0 }
  const arr = getAll(key)
  const filtered = arr.filter(r => r[idField] !== idValue)
  setAll(key, filtered)
  return arr.length - filtered.length
}

function update(key, idField, idValue, patch) {
  if (!_privacyAllowed()) { logger.warn('[local-store] update blocked: privacy not agreed'); return false }
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

function getRaw(key) {
  const nsKey = _nsKey(key)
  try { return wx.getStorageSync(nsKey) } catch (e) { return null }
}

function setRaw(key, value) {
  if (!_privacyAllowed()) { logger.warn('[local-store] setRaw blocked: privacy not agreed'); return }
  const nsKey = _nsKey(key)
  try { wx.setStorageSync(nsKey, value) } catch (e) {}
}

function removeAllForOpenid(openid) {
  if (!openid) return 0
  const prefix = 'ns_' + openid + '_'
  const ALL_BASE_KEYS = Object.values(STORES)
  let count = 0
  ALL_BASE_KEYS.forEach(baseKey => {
    const nsKey = prefix + baseKey
    try {
      const v = wx.getStorageSync(nsKey)
      if (v !== '' && v !== undefined) {
        wx.removeStorageSync(nsKey)
        count++
      }
    } catch (e) {}
  })
  logger.info('[local-store] removeAllForOpenid openid=', openid, 'count=', count)
  return count
}

function removeAllNamespacedKeys() {
  let count = 0
  try {
    const info = wx.getStorageInfoSync()
    if (!info || !info.keys) return 0
    info.keys.forEach(k => {
      if (k.startsWith('ns_')) {
        wx.removeStorageSync(k)
        count++
      }
    })
  } catch (e) {}
  logger.info('[local-store] removeAllNamespacedKeys count=', count)
  return count
}

function removeAllGuestNsKeys() {
  let count = 0
  try {
    const info = wx.getStorageInfoSync()
    if (!info || !info.keys) return 0
    info.keys.forEach(k => {
      if (k.startsWith('ns_guest_')) {
        wx.removeStorageSync(k)
        count++
      }
    })
  } catch (e) {}
  logger.info('[local-store] removeAllGuestNsKeys count=', count)
  return count
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
      try { setAll(storageKey, kept) } catch (e) {
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

function _cloud() {
  try {
    const app = getApp && getApp()
    if (!app || !app.globalData) return null
    if (!app.globalData.cloudReady || app.globalData.isGuest) return null
    return wx.cloud.database()
  } catch (e) { return null }
}

function _stripCloudFields(doc) {
  if (!doc) return null
  const { _id, _openid, openid, create_time, update_time, ...rest } = doc
  return rest
}

async function syncCustomFoodsFromCloud() {
  const cloud = _cloud()
  if (!cloud) return 0
  const openid = _getOpenid()
  try {
    const res = await cloud.collection('custom_food').where({ openid }).limit(500).get()
    const cloudList = (res.data || []).map(_stripCloudFields).filter(Boolean)
    const localList = getAll(STORES.CUSTOM_FOODS)
    const mergedMap = new Map()
    cloudList.forEach(f => { if (f.food_id) mergedMap.set(f.food_id, f) })
    localList.forEach(f => { if (!mergedMap.has(f.food_id)) mergedMap.set(f.food_id, f) })
    setAll(STORES.CUSTOM_FOODS, Array.from(mergedMap.values()))
    logger.info('[local-store] syncCustomFoodsFromCloud cloud=', cloudList.length, 'merged=', mergedMap.size)
    return mergedMap.size
  } catch (err) {
    logger.warn('[local-store] syncCustomFoodsFromCloud fail', err.message)
    return 0
  }
}

async function syncUserPrefFromCloud() {
  const cloud = _cloud()
  if (!cloud) return null
  const openid = _getOpenid()
  try {
    const res = await cloud.collection('user_pref').where({ openid }).limit(1).get()
    const pref = res.data && res.data[0]
    if (pref) {
      if (Array.isArray(pref.removed_builtin_foods)) {
        setAll(STORES.REMOVED_BUILTIN, pref.removed_builtin_foods)
      }
    }
    logger.info('[local-store] syncUserPrefFromCloud ok')
    return pref
  } catch (err) {
    logger.warn('[local-store] syncUserPrefFromCloud fail', err.message)
    return null
  }
}

async function addCustomFoodCloud(food) {
  const cloud = _cloud()
  if (!cloud) return
  try {
    const openid = _getOpenid()
    const cloudDoc = { ...food, openid, create_time: cloud.serverDate() }
    await cloud.collection('custom_food').add({ data: cloudDoc })
    logger.info('[local-store] addCustomFoodCloud ok id=', food.food_id)
  } catch (err) {
    logger.warn('[local-store] addCustomFoodCloud fail', err.message)
  }
}

async function removeCustomFoodCloud(foodIds) {
  const cloud = _cloud()
  if (!cloud || !Array.isArray(foodIds)) return
  const openid = _getOpenid()
  for (const fid of foodIds) {
    try { await cloud.collection('custom_food').where({ food_id: fid, openid }).remove() } catch (e) {}
  }
  logger.info('[local-store] removeCustomFoodCloud ids=', foodIds.length)
}

async function saveRemovedBuiltinCloud(ids) {
  const cloud = _cloud()
  if (!cloud) return
  const openid = _getOpenid()
  try {
    const res = await cloud.collection('user_pref').where({ openid }).limit(1).get()
    if (res.data && res.data.length > 0) {
      await cloud.collection('user_pref').doc(res.data[0]._id).update({
        data: { removed_builtin_foods: ids, update_time: cloud.serverDate() }
      })
    } else {
      await cloud.collection('user_pref').add({
        data: { openid, removed_builtin_foods: ids, create_time: cloud.serverDate(), update_time: cloud.serverDate() }
      })
    }
    logger.info('[local-store] saveRemovedBuiltinCloud ok count=', ids.length)
  } catch (err) {
    logger.warn('[local-store] saveRemovedBuiltinCloud fail', err.message)
  }
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
  getRaw,
  setRaw,
  removeAllForOpenid,
    removeAllNamespacedKeys,
    removeAllGuestNsKeys,
    cleanupOldRecords,
    syncCustomFoodsFromCloud,
    syncUserPrefFromCloud,
    addCustomFoodCloud,
    removeCustomFoodCloud,
    saveRemovedBuiltinCloud
  }
