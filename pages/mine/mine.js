const app = getApp()
const logger = require('../../utils/logger.js')
const { showToast, calcNutritionTarget } = require('../../utils/util.js')

const TAG = '[page:mine]'

Page({
  data: {
    userInfo: {},
    avatarInitial: 'U',
    target: {
      energy: { min: 0, max: 0 },
      protein: { min: 0, max: 0 },
      fat: { min: 0, max: 0 },
      carb: { min: 0, max: 0 },
      fiber: { min: 0, max: 0 },
      salt: { min: 0, max: 0 }
    },
    bmi: '--'
  },

  onShow() {
    logger.info(TAG, 'onShow')
    this.loadData()
  },

  loadData() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const target = wx.getStorageSync('nutritionTarget') || this.data.target
      let bmi = '--'

      if (userInfo.height && userInfo.weight) {
        const h = userInfo.height / 100
        const b = userInfo.weight / (h * h)
        bmi = b.toFixed(1)
      }

      const nameSrc = userInfo.real_name || userInfo.nickname || 'U'
      const avatarInitial = (nameSrc && nameSrc.length > 0) ? nameSrc.charAt(0) : 'U'

      this.setData({ userInfo, target, bmi, avatarInitial })
      logger.info(TAG, 'loadData bmi=', bmi)
    } catch (err) {
      logger.error(TAG, 'loadData error', err.message)
    }
  },

  goEdit() {
    logger.info(TAG, 'goEdit')
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  refreshTarget() {
    logger.info(TAG, 'refreshTarget start')
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.height) {
        showToast('请先完善个人资料')
        setTimeout(() => wx.navigateTo({ url: '/pages/profile/profile' }), 1000)
        return
      }

      const target = calcNutritionTarget({
        gender: userInfo.gender,
        height: userInfo.height,
        weight: userInfo.weight,
        age: userInfo.age || 25,
        activity_level: userInfo.activity_level || 1.2
      })

      wx.setStorageSync('nutritionTarget', target)
      app.refreshNutritionTarget(target)
      this.setData({ target })
      showToast('营养目标已更新')
      logger.info(TAG, 'refreshTarget ok energy=', target.energy?.value || target.energy)
    } catch (err) {
      logger.error(TAG, 'refreshTarget error', err.message)
      showToast('更新失败')
    }
  },

  onSubscribeMsg() {
    logger.info(TAG, 'onSubscribeMsg')
    wx.showModal({
      title: '饮食提醒',
      content: '长期订阅提醒功能需要在微信公众平台申请订阅模板并开通云服务，暂未开放。\n\n你可以在每个餐次记录完后，手动返回首页查看今日营养汇总。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  _openReminderSettings() {},

  showAbout() {
    logger.info(TAG, 'showAbout')
    wx.showModal({
      title: '健康管家',
      content: '版本: 1.0.0\n科学健身，健康饮食，管理你的每一天。',
      showCancel: false
    })
  },

  onLogout() {
    logger.info(TAG, 'onLogout')
    wx.showModal({
      title: '确认退出',
      content: '退出后下次进入需重新授权登录（历史数据将保留）',
      success: (res) => {
        if (res.confirm) {
          try {
            app.clearLoginData()
            showToast('已退出登录')
            logger.info(TAG, 'onLogout ok')
            setTimeout(() => {
              wx.reLaunch({ url: '/pages/login/login' })
            }, 800)
          } catch (err) {
            logger.error(TAG, 'onLogout error', err.message)
          }
        }
      }
    })
  }
})
