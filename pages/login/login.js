const app = getApp()
const logger = require('../../utils/logger.js')

const TAG = '[page:login]'

Page({
  data: {
    loading: false
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    const openid = wx.getStorageSync('openid')
    const userInfo = wx.getStorageSync('userInfo')
    logger.info(TAG, 'onLoad openid=', !!openid, 'profileComplete=', !!userInfo?.real_name)

    if (openid && userInfo) {
      if (!userInfo.real_name || !userInfo.height || !userInfo.weight) {
        logger.info(TAG, 'onLoad redirect=profile')
        wx.reLaunch({ url: '/pages/profile/profile' })
      } else {
        logger.info(TAG, 'onLoad redirect=diet_tab')
        wx.switchTab({ url: '/pages/diet/diet' })
      }
    }
  },

  async onWxLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    logger.info(TAG, 'onWxLogin start cloudReady=', app.globalData.cloudReady)

    try {
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

      app.setLoginData(loginData)
      const userInfo = loginData.userInfo
      logger.info(TAG, 'onWxLogin ok user_id=', userInfo.user_id, 'needProfile=', !userInfo.real_name)

      if (!userInfo.real_name || !userInfo.height || !userInfo.weight) {
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
    const openid = 'local_' + Date.now().toString(36)
    const existing = wx.getStorageSync('userInfo')
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
