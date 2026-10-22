const localDB = require('../../utils/cloud-storage.js')
const app = getApp()
const logger = require('../../utils/logger.js')

const TAG = '[page:login]'

const USER_AGREEMENT = `【INFJ 的 FitMeal · 用户服务协议】

欢迎使用 INFJ 的 FitMeal 健康管理小程序。使用本服务即视为您已阅读并同意本协议全部条款。

一、服务内容
本小程序为个人健康管理工具，提供健身训练规划、饮食营养记录、体重追踪等功能。所有功能仅供个人参考，不构成医疗诊断或治疗建议。

二、用户行为规范
您承诺不利用本小程序从事任何违反法律法规的活动，不传播有害信息。本小程序不会主动获取您通讯录、位置等敏感信息。

三、免责声明
1. 本小程序提供的负重推荐、营养计算等均为通用参考值，实际训练与饮食请结合个人身体状况。
2. 因您违反规范或不听从建议导致的任何后果，由您自行承担。
3. 本小程序可能因技术原因暂时中断服务，我们将尽力减少对您的影响。

四、协议变更
我们保留修改本协议的权利。修改后将在小程序内公告，继续使用服务即视为您接受变更后的协议。

五、联系我们
如对本协议有任何疑问，请通过小程序内反馈渠道联系我们。`

const PRIVACY_POLICY = `【INFJ 的 FitMeal · 隐私政策】

我们非常重视您的隐私。本政策说明我们如何收集、使用、存储您的信息。

一、收集的信息
1. 微信授权信息：昵称、头像（仅在您主动授权时获取）
2. 您主动填写的健康数据：身高、体重、年龄、活动等级
3. 您使用本小程序产生的记录：饮食记录、训练计划、体重记录

二、信息使用目的
1. 提供健康管理核心服务（营养计算、负重推荐、数据统计）
2. 改善产品体验（基于使用数据优化功能）
3. 保障账号安全与服务稳定

三、信息存储与保护
1. 所有业务数据默认存储于您设备的本地，不主动上传
2. 云开发启用时，数据在您明确授权后同步至您的专属空间
3. 我们采用行业标准的安全措施保护您的数据

四、信息共享
我们不会将您的个人信息出售、出租或共享给任何第三方，法律法规要求的除外。

五、您的权利
您可以随时在"我的"页面查看、修改或删除您的健康数据。您可以随时注销账号。

六、变更与联系
本政策可能不定期更新。如有重大变更，我们将在小程序内显著位置告知。`

Page({
  data: {
    loading: false,
    agreed: false
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    const openid = wx.getStorageSync('openid')
    const userInfo = localDB.getRaw('userInfo')
    const lastAgreed = wx.getStorageSync('privacy_agreed')
    logger.info(TAG, 'onLoad openid=', !!openid, 'profileComplete=', !!userInfo?.real_name)

    if (lastAgreed === true) {
      this.setData({ agreed: true })
    }

    if (openid && userInfo) {
      const isGuest = wx.getStorageSync('isGuest') === true
      if (isGuest) {
        logger.info(TAG, 'onLoad isGuest → redirect=diet_tab (skip profile)')
        wx.switchTab({ url: '/pages/diet/diet' })
      } else if (!userInfo.real_name || !userInfo.height || !userInfo.weight) {
        logger.info(TAG, 'onLoad redirect=profile')
        wx.reLaunch({ url: '/pages/profile/profile' })
      } else {
        logger.info(TAG, 'onLoad redirect=diet_tab')
        wx.switchTab({ url: '/pages/diet/diet' })
      }
    }
  },

  onToggleAgree() {
    const next = !this.data.agreed
    this.setData({ agreed: next })
    logger.info(TAG, 'onToggleAgree agreed=', next)
  },

  async onViewAgreement(e) {
    const type = e.currentTarget.dataset.type
    const title = type === 'user' ? '用户服务协议' : '隐私政策'
    const content = type === 'user' ? USER_AGREEMENT : PRIVACY_POLICY

    const res = await new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        confirmText: '同意',
        cancelText: '不同意',
        success: resolve
      })
    })

    if (res.confirm) {
      this.setData({ agreed: true })
      wx.setStorageSync('privacy_agreed', true)
      logger.info(TAG, 'onViewAgreement user_confirmed type=', type)
    }
  },

  async onGuestLogin() {
    logger.info(TAG, 'onGuestLogin start')

    app.wipeAllBusinessData()

    const openid = 'guest_' + Date.now().toString(36)
    const loginData = {
      openid,
      token: 'guest_token_' + Date.now(),
      isGuest: true,
      userInfo: {
        user_id: 'u_' + Date.now().toString(36),
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
    }

    app.setLoginData(loginData)
    wx.setStorageSync('isGuest', true)
    app.globalData.isGuest = true

    logger.info(TAG, 'onGuestLogin ok openid=', openid)
    wx.showToast({ title: '欢迎体验', icon: 'success', duration: 1000 })

    setTimeout(() => {
      wx.switchTab({ url: '/pages/diet/diet' })
    }, 600)
  },

  async onWxLogin() {
    if (this.data.loading) return

    if (!this.data.agreed) {
      wx.showModal({
        title: '请先同意协议',
        content: '使用本小程序需要您先阅读并同意《用户服务协议》和《隐私政策》。您可以点击下方链接查看协议内容。',
        confirmText: '去查看',
        cancelText: '再想想'
      })
      return
    }

    this.setData({ loading: true })
    logger.info(TAG, 'onWxLogin start cloudReady=', app.globalData.cloudReady)  

    try {
      wx.setStorageSync('privacy_agreed', true)

      const profileRes = await new Promise((resolve) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: () => resolve({ userInfo: {} })
        })
      })
      logger.info(TAG, 'onWxLogin getUserProfile ok nickname=', profileRes.userInfo?.nickName)

      let loginData
      if (app.globalData.cloudReady) {
        try {
          logger.info(TAG, 'onWxLogin callFunction=login')
          const cloudRes = await wx.cloud.callFunction({
            name: 'login',
            data: {
              nickname: profileRes.userInfo?.nickName || '微信用户',
              avatar_url: profileRes.userInfo?.avatarUrl || ''
            }
          })
          logger.info(TAG, 'onWxLogin callFunction=login result code=', cloudRes.result?.code)

          if (cloudRes.result?.code !== 0) {
            throw new Error(cloudRes.result?.message || '云函数返回错误')       
          }
          loginData = cloudRes.result.data
        } catch (cloudErr) {
          logger.warn(TAG, 'onWxLogin cloud_fail fallback=mock', cloudErr.message)
          loginData = this.mockLogin(profileRes.userInfo)
        }
      } else {
        logger.info(TAG, 'onWxLogin cloud_not_ready use_local_mock')
        loginData = this.mockLogin(profileRes.userInfo)
      }

      loginData.isGuest = false
      app.setLoginData(loginData)
      wx.removeStorageSync('isGuest')
      app.globalData.isGuest = false

      const mergedUserInfo = app.globalData.userInfo || localDB.getRaw('userInfo')
      logger.info(TAG, 'onWxLogin ok user_id=', mergedUserInfo?.user_id,
        'needProfile=', !!(mergedUserInfo && (!mergedUserInfo.real_name || !mergedUserInfo.height || !mergedUserInfo.weight)))

      if (!mergedUserInfo || !mergedUserInfo.real_name || !mergedUserInfo.height || !mergedUserInfo.weight) {
        wx.reLaunch({ url: '/pages/profile/profile' })
      } else {
        wx.switchTab({ url: '/pages/diet/diet' })
      }
    } catch (err) {
      logger.error(TAG, 'onWxLogin fatal error', err.name, err.message, err.stack?.split('\n').slice(0, 3).join(' | '))
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  mockLogin(wxUserInfo) {
      let openid = wx.getStorageSync('persistent_openid')
      if (!openid) {
        openid = 'local_' + Date.now().toString(36)
        wx.setStorageSync('persistent_openid', openid)
        logger.info(TAG, 'mockLogin created new persistent_openid=', openid)
      } else {
          logger.info(TAG, 'mockLogin reuse existing persistent_openid=', openid)
        }
        wx.setStorageSync('openid', openid)
    const existing = localDB.getRaw('userInfo')
    const hasFullProfile = existing && existing.real_name && existing.height && existing.weight

    const userInfo = hasFullProfile
      ? { ...existing, nickname: wxUserInfo?.nickName || existing.nickname, avatar_url: wxUserInfo?.avatarUrl || existing.avatar_url }
      : {
          user_id: 'u_' + Date.now().toString(36),
          openid,
          nickname: wxUserInfo?.nickName || '本地用户',
          real_name: '',
          gender: 0,
          height: 0,
          weight: 0,
          avatar_url: wxUserInfo?.avatarUrl || '',
          activity_level: 1,
          create_time: new Date(),
          update_time: new Date()
        }
    logger.info(TAG, 'mockLogin openid=', openid, 'reuse_existing=', hasFullProfile)
    return {
      openid,
      token: 'local_token_' + Date.now(),
      userInfo
    }
  }
})
