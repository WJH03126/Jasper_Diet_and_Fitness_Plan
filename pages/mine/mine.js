const app = getApp()
const localDB = require('../../utils/cloud-storage.js')
const logger = require('../../utils/logger.js')
const { showToast, calcNutritionTarget, showModal, requirePrivacyAgree } = require('../../utils/util.js')       

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
    bmi: '--',
    isGuest: false
  },

  onShow() {
    logger.info(TAG, 'onShow')
    this.loadData()
  },

  loadData() {
    try {
      const isGuest = app.isGuestSession()
      const userInfo = localDB.getRaw('userInfo') || {}
      const target = localDB.getRaw('nutritionTarget') || this.data.target   
      let bmi = '--'

      if (userInfo.height && userInfo.weight) {
        const h = userInfo.height / 100
        const b = userInfo.weight / (h * h)
        bmi = b.toFixed(1)
      }

      const nameSrc = userInfo.real_name || userInfo.nickname || 'U'
      const avatarInitial = (nameSrc && nameSrc.length > 0) ? nameSrc.charAt(0) : 'U'

      this.setData({ userInfo, target, bmi, avatarInitial, isGuest })
      logger.info(TAG, 'loadData bmi=', bmi, 'isGuest=', isGuest)
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
      const userInfo = localDB.getRaw('userInfo')
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

      localDB.setRaw('nutritionTarget', target)
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

  onViewAgreement(e) {
    const type = e.currentTarget.dataset.type
    const isUser = type === 'user'
    const title = isUser ? '用户服务协议' : '隐私政策'
    const content = isUser
      ? '【INFJ 的 FitMeal · 用户服务协议】\n\n欢迎使用 INFJ 的 FitMeal 健康管理小程序。使用本服务即视为您已阅读并同意本协议全部条款。\n\n一、服务内容\n本小程序为个人健康管理工具，提供健身训练规划、饮食营养记录、体重追踪等功能。所有功能仅供个人参考，不构成医疗诊断或治疗建议。\n\n二、用户行为规范\n您承诺不将本应用用于违法违规用途，不干扰或破坏系统正常运行。\n\n三、数据存储\n个人数据存储在您的设备本地。退出游客模式或清理缓存将导致数据丢失，请自行备份重要记录。\n\n四、协议变更\n我们保留修改本协议的权利。修改后将在小程序内公告，继续使用服务即视为您接受变更后的协议。'
      : '【INFJ 的 FitMeal · 隐私政策】\n\n我们非常重视您的隐私。本政策说明我们如何收集、使用、存储您的信息。\n\n一、信息收集\n• 基础信息：微信授权的昵称、头像（仅正式用户）\n• 使用数据：饮食记录、训练记录、体重记录（存储在本地）\n\n二、信息使用\n• 为您提供饮食记录、训练规划、营养分析等核心功能\n• 匿名聚合用于改进产品体验\n\n三、信息存储\n数据仅存储在您的设备本地，不上传任何云服务器（除非您主动启用云同步）。\n\n四、信息保护\n我们采取行业标准的安全技术保护您的数据安全。\n\n五、您的权利\n您可以随时在设置中清除本地数据。退出游客模式将清空所有游客数据。';
    wx.showModal({
      title, content, showCancel: false, confirmText: '知道了'
    })
  },

  showAbout() {
    logger.info(TAG, 'showAbout')
    wx.showModal({
      title: 'INFJ 的 FitMeal',
      content: '版本: 1.0.0\n科学健身，健康饮食，管理你的每一天。',
      showCancel: false
    })
  },

  async onUpgradeToNormal() {
    logger.info(TAG, 'onUpgradeToNormal start')
    const confirm = await showModal('退出游客模式', '升级为正式用户需要先退出当前游客会话（将清空所有游客数据），然后返回登录页进行微信授权登录。确认继续吗？', { confirmText: '确定', cancelText: '取消' })
    if (!confirm) { logger.info(TAG, 'onUpgradeToNormal cancelled'); return }
    app.clearGuestData()
    setTimeout(() => { wx.reLaunch({ url: '/pages/login/login' }) }, 300)
  },

  onLogout() {
    logger.info(TAG, 'onLogout isGuest=', this.data.isGuest)

    const isGuest = this.data.isGuest
    const title = isGuest ? '退出游客模式' : '确认退出'
    const content = isGuest
      ? '退出后，所有浏览过程中产生的饮食记录、训练计划、体重记录等数据将被清空，且无法恢复。确定退出吗？'
      : '退出后下次进入需重新授权登录（历史数据将保留）'
    const confirmText = isGuest ? '确定退出' : '确定退出'

    wx.showModal({
      title,
      content,
      confirmText,
      cancelText: isGuest ? '继续体验' : '取消',
      success: (res) => {
        if (!res.confirm) return
        logger.info(TAG, 'onLogout user_confirmed isGuest=', isGuest)

        try {
          if (isGuest) {
            app.clearGuestData()
          } else {
            app.clearLoginData()
          }
          logger.info(TAG, 'onLogout clear_ok, redirecting to login')

          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' })
          }, 300)
        } catch (err) {
          logger.error(TAG, 'onLogout error', err.message)
          wx.showModal({
            title: '退出失败',
            content: err.message || '未知错误',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        logger.error(TAG, 'onLogout showModal fail', err && err.errMsg)
      }
    })
  }
})
