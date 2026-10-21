const logger = require('./utils/logger.js')
const localDB = require('./utils/cloud-storage.js')

const TAG = '[app]'
const MAX_RECORD_AGE_DAYS = 365

App({
  globalData: {
    userInfo: null,
    openid: null,
    nutritionTarget: null,
    cloudReady: false
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
    logger.info(TAG, 'checkLoginStatus token=', !!token, 'openid=', openid)

    if (token && openid) {
      this.globalData.openid = openid
      this.loadUserInfo()
    } else {
      logger.info(TAG, 'checkLoginStatus no_session')
    }
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        logger.info(TAG, 'loadUserInfo ok user_id=', userInfo.user_id || 'local', 'nickname=', userInfo.nickname)
      }
      const target = wx.getStorageSync('nutritionTarget')
      if (target) {
        this.globalData.nutritionTarget = target
        logger.info(TAG, 'loadUserInfo nutritionTarget_ok version=', target.version)
      }
    } catch (err) {
      logger.error(TAG, 'loadUserInfo error', err.message)
    }
  },

  setLoginData(data) {
    logger.info(TAG, 'setLoginData openid=', data.openid, 'hasUserInfo=', !!data.userInfo)
    try {
      wx.setStorageSync('token', data.token)
      wx.setStorageSync('openid', data.openid)
      this.globalData.openid = data.openid
      if (data.userInfo) {
        wx.setStorageSync('userInfo', data.userInfo)
        this.globalData.userInfo = data.userInfo
      }
      if (data.nutritionTarget) {
        wx.setStorageSync('nutritionTarget', data.nutritionTarget)
        this.globalData.nutritionTarget = data.nutritionTarget
      }
      logger.info(TAG, 'setLoginData ok, triggering daily cleanup')
      this._runDailyCleanup()
    } catch (err) {
      logger.error(TAG, 'setLoginData storage error', err.message)
    }
  },

  clearLoginData() {
    logger.info(TAG, 'clearLoginData start (auth only, keep records)')
    try {
      wx.removeStorageSync('token')
      wx.removeStorageSync('openid')
      this.globalData.openid = null
      logger.info(TAG, 'clearLoginData ok')
    } catch (err) {
      logger.error(TAG, 'clearLoginData storage error', err.message)
    }
  },

  refreshNutritionTarget(target) {
    logger.info(TAG, 'refreshNutritionTarget version=', target?.version)
    wx.setStorageSync('nutritionTarget', target)
    this.globalData.nutritionTarget = target
  },

  isProfileComplete() {
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo')
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
