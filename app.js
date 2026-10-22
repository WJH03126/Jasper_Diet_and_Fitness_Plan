const logger = require('./utils/logger.js')
const localDB = require('./utils/cloud-storage.js')

const TAG = '[app]'
const MAX_RECORD_AGE_DAYS = 365

const ALL_DATA_KEYS = [
  'local_diet_records',
  'local_fitness_plans',
  'local_fitness_records',
  'local_weight_records',
  'local_plan_templates',
  'local_subscribe_msgs',
  'custom_foods',
  'removed_builtin_foods',
  'userInfo',
  'nutritionTarget',
  'pending_diet_date',
  'eq_to_add'
]

const SYSTEM_KEYS_KEEP = ['privacy_agreed', 'last_cleanup_date']

App({
  globalData: {
    userInfo: null,
    openid: null,
    nutritionTarget: null,
    cloudEnv: 'cloud1-d7gflcp2y6cf37479',
    cloudReady: false,
    isGuest: false
  },

  onLaunch() {
    logger.info(TAG, 'onLaunch start')

    if (!wx.cloud) {
      logger.error(TAG, 'onLaunch fail reason=no_wx_cloud')
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      this.globalData.cloudReady = false
      this.checkLoginStatus()
      return
    }

    try {
      wx.cloud.init({
        env: this.globalData.cloudEnv || undefined,
        traceUser: true
      })
      this.globalData.cloudReady = true
      logger.info(TAG, 'onLaunch cloudInit ok env=', this.globalData.cloudEnv || '(auto-default)')
    } catch (err) {
      logger.error(TAG, 'onLaunch cloudInit fail', err.message, err.stack?.split('\n').slice(0, 3).join(' | '))
      this.globalData.cloudReady = false
    }

    this.checkLoginStatus()
    logger.info(TAG, 'onLaunch done session=', logger.sessionId)
  },

  async _runDailyCleanup() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const lastRun = wx.getStorageSync('last_cleanup_date')
      if (lastRun === today) {
        logger.info(TAG, 'cleanup already ran today, skip')
        return
      }
      const stats = await localDB.cleanupOldRecords(MAX_RECORD_AGE_DAYS, this.globalData.cloudReady)
      const totalLocal = Object.values(stats).reduce((s, o) => s + (o.localRemoved || 0), 0)
      const totalCloud = Object.values(stats).reduce((s, o) => s + (o.cloudRemoved || 0), 0)
      wx.setStorageSync('last_cleanup_date', today)
      logger.info(TAG, 'cleanup done, local=', totalLocal, 'cloud=', totalCloud, 'stats=', JSON.stringify(stats))
    } catch (err) {
      logger.error(TAG, '_runDailyCleanup error', err && err.message)
    }
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const openid = wx.getStorageSync('openid')
    const isGuest = wx.getStorageSync('isGuest') === true
    logger.info(TAG, 'checkLoginStatus token=', !!token, 'openid=', openid, 'isGuest=', isGuest)

    if (token && openid) {
      this.globalData.openid = openid
      this.globalData.isGuest = isGuest
      this.loadUserInfo()

      if (isGuest && !wx.getStorageSync('guest_data_cleaned_v2')) {
        logger.warn(TAG, 'guest session residual data detected, auto-wiping')
        this._removeAllDataKeys()
        const cleanUserInfo = {
          user_id: 'u_' + openid.slice(-8),
          openid,
          nickname: '游客',
          real_name: '',
          gender: 0,
          height: 0,
          weight: 0,
          avatar_url: '',
          activity_level: 1,
          is_guest: true,
          create_time: new Date(),
          update_time: new Date()
        }
        localDB.setRaw('userInfo', cleanUserInfo)
        this.globalData.userInfo = cleanUserInfo
        wx.setStorageSync('guest_data_cleaned_v2', true)
        logger.info(TAG, 'guest residual data wiped, clean userInfo restored')
      }
    } else {
      logger.info(TAG, 'checkLoginStatus no_session')
    }
  },

  loadUserInfo() {
    try {
      const userInfo = localDB.getRaw('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        logger.info(TAG, 'loadUserInfo ok user_id=', userInfo.user_id || 'local', 'nickname=', userInfo.nickname)
      }
      const target = localDB.getRaw('nutritionTarget')
      if (target) {
        this.globalData.nutritionTarget = target
        logger.info(TAG, 'loadUserInfo nutritionTarget_ok version=', target.version)
      } else if (userInfo && userInfo.nutrition_target) {
        this.globalData.nutritionTarget = userInfo.nutrition_target
        localDB.setRaw('nutritionTarget', userInfo.nutrition_target)
        logger.info(TAG, 'loadUserInfo nutritionTarget_ok from_userInfo')
      }
    } catch (err) {
      logger.error(TAG, 'loadUserInfo error', err.message)
    }
  },

  setLoginData(data) {
    logger.info(TAG, 'setLoginData openid=', data.openid, 'hasUserInfo=', !!data.userInfo, 'isGuest=', !!data.isGuest)
    try {
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('openid', data.openid)
      this.globalData.openid = data.openid
      this.globalData.isGuest = !!data.isGuest
      if (data.isGuest) {
        wx.setStorageSync('isGuest', true)
      }
      if (data.userInfo) {
        const localExisting = localDB.getRaw('userInfo')
        const merged = { ...data.userInfo }
        if (localExisting) {
          const MERGE_FIELDS = ['real_name', 'gender', 'height', 'weight', 'age', 'activity_level']
          MERGE_FIELDS.forEach(f => {
            const cloudVal = data.userInfo[f]
            const localVal = localExisting[f]
            if ((cloudVal == null || cloudVal === '' || cloudVal === 0) &&
                localVal != null && localVal !== '' && localVal !== 0) {
              merged[f] = localVal
            }
          })
          logger.info(TAG, 'setLoginData merged local userInfo fields=',
            MERGE_FIELDS.filter(f => merged[f] !== data.userInfo[f]).join(','))
        }
        localDB.setRaw('userInfo', merged)
        this.globalData.userInfo = merged
      }
      if (data.nutritionTarget) {
        localDB.setRaw('nutritionTarget', data.nutritionTarget)
        this.globalData.nutritionTarget = data.nutritionTarget
      } else if (data.userInfo && data.userInfo.nutrition_target) {
        localDB.setRaw('nutritionTarget', data.userInfo.nutrition_target)
        this.globalData.nutritionTarget = data.userInfo.nutrition_target
        logger.info(TAG, 'setLoginData restored nutritionTarget from userInfo.nutrition_target')
      } else {
        const localTarget = localDB.getRaw('nutritionTarget')
        if (localTarget) {
          this.globalData.nutritionTarget = localTarget
          logger.info(TAG, 'setLoginData restored local nutritionTarget')
        }
      }
      logger.info(TAG, 'setLoginData ok, triggering daily cleanup')
      this._runDailyCleanup()
    } catch (err) {
      logger.error(TAG, 'setLoginData storage error', err.message)
    }
  },

  isGuestSession() {
    return this.globalData.isGuest === true || wx.getStorageSync('isGuest') === true
  },

  _removeAllDataKeys() {
    let count = 0
    ALL_DATA_KEYS.forEach(key => {
      try {
        const v = wx.getStorageSync(key)
        if (v !== '' && v !== undefined) {
          wx.removeStorageSync(key)
          count++
        }
      } catch (e) {}
    })
    try { wx.removeStorageSync('guest_data_cleaned_v2') } catch (e) {}
    this.globalData.userInfo = null
    this.globalData.nutritionTarget = null
    return count
  },

  wipeAllBusinessData() {
    logger.info(TAG, 'wipeAllBusinessData start (guest login pre-clean)')
    const count = localDB.removeAllGuestNsKeys()
    wx.removeStorageSync('privacy_agreed')
    wx.removeStorageSync('guest_data_cleaned_v2')
    logger.info(TAG, 'wipeAllBusinessData ok, wiped=', count, 'ns_guest_ keys + privacy')
  },

  clearLoginData() {
    logger.info(TAG, 'clearLoginData start (auth only, keep records)')
    try {
      wx.removeStorageSync('token')
      wx.removeStorageSync('openid')
      wx.removeStorageSync('isGuest')
      this.globalData.openid = null
      this.globalData.isGuest = false
      this.globalData.userInfo = null
      this.globalData.nutritionTarget = null
      logger.info(TAG, 'clearLoginData ok')
    } catch (err) {
      logger.error(TAG, 'clearLoginData storage error', err.message)
    }
  },

  clearGuestData() {
    logger.info(TAG, 'clearGuestData start (wipe auth + guest ns data + privacy)')
    try {
      const curOpenid = wx.getStorageSync('openid')
      wx.removeStorageSync('token')
      wx.removeStorageSync('openid')
      wx.removeStorageSync('isGuest')
      wx.removeStorageSync('privacy_agreed')
      wx.removeStorageSync('guest_data_cleaned_v2')
      this.globalData.openid = null
      this.globalData.isGuest = false

      const count = localDB.removeAllForOpenid(curOpenid)

      logger.info(TAG, 'clearGuestData ok, openid=', curOpenid, 'wiped=', count)
    } catch (err) {
      logger.error(TAG, 'clearGuestData error', err.message)
    }
  },

  refreshNutritionTarget(target) {
    logger.info(TAG, 'refreshNutritionTarget version=', target?.version)        
    localDB.setRaw('nutritionTarget', target)
    this.globalData.nutritionTarget = target
  },

  isProfileComplete() {
    const userInfo = this.globalData.userInfo || localDB.getRaw('userInfo')  
    if (!userInfo) return false
    return !!(userInfo.real_name && userInfo.gender && userInfo.height && userInfo.weight)
  },

  clearTrainingData(mode) {
    const result = { plansCleared: 0, recordsCleared: 0 }
    try {
      if (mode === 'all') {
        const plans = localDB.getAll(localDB.STORES.FITNESS_PLANS)
        plans.forEach(p => localDB.remove(localDB.STORES.FITNESS_PLANS, 'plan_id', p.plan_id))
        result.plansCleared = plans.length

        const records = localDB.getAll(localDB.STORES.FITNESS_RECORDS)
        records.forEach(r => localDB.remove(localDB.STORES.FITNESS_RECORDS, 'record_id', r.record_id))
        result.recordsCleared = records.length
      } else if (mode === 'records_only') {
        const records = localDB.getAll(localDB.STORES.FITNESS_RECORDS)
        records.forEach(r => localDB.remove(localDB.STORES.FITNESS_RECORDS, 'record_id', r.record_id))
        result.recordsCleared = records.length
      } else {
        const plans = localDB.getAll(localDB.STORES.FITNESS_PLANS)
        const autoPlans = plans.filter(p => p.auto_created)
        autoPlans.forEach(p => localDB.remove(localDB.STORES.FITNESS_PLANS, 'plan_id', p.plan_id))
        result.plansCleared = autoPlans.length

        const records = localDB.getAll(localDB.STORES.FITNESS_RECORDS)
        records.forEach(r => localDB.remove(localDB.STORES.FITNESS_RECORDS, 'record_id', r.record_id))
        result.recordsCleared = records.length
      }
      logger.info(TAG, 'clearTrainingData mode=', mode, 'result=', JSON.stringify(result))
    } catch (err) {
      logger.error(TAG, 'clearTrainingData error', err.message)
    }
    return result
  }
})
