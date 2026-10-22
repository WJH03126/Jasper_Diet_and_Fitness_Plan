const localDB = require('../../utils/cloud-storage.js')
const app = getApp()
const logger = require('../../utils/logger.js')
const {showLoading, hideLoading, showToast, calcNutritionTarget, requirePrivacyAgree} = require('../../utils/util.js')

const TAG = '[page:profile]'

Page({
  data: {
    form: {
      nickname: '', real_name: '', gender: 0,
      height: '', weight: '', age: '', activity_level: 1
    },
    activityOptions: ['轻体力活动', '中体力活动', '重体力活动'],
    activityIndex: 0,
    submitting: false,
    isEdit: false
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    const userInfo = localDB.getRaw('userInfo')
    if (userInfo && userInfo.real_name) {
      logger.info(TAG, 'onLoad mode=edit nickname=', userInfo.nickname)
      this.setData({
        form: {
          nickname: userInfo.nickname || '', real_name: userInfo.real_name || '',
          gender: userInfo.gender || 0, height: userInfo.height || '',
          weight: userInfo.weight || '', age: userInfo.age || '', activity_level: userInfo.activity_level || 1
        },
        activityIndex: (userInfo.activity_level || 1) - 1, isEdit: true
      })
    } else if (userInfo) {
      logger.info(TAG, 'onLoad mode=first nickname=', userInfo.nickname)
      this.setData({ 'form.nickname': userInfo.nickname || '' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  selectGender(e) { this.setData({ 'form.gender': Number(e.currentTarget.dataset.value) }) },

  onActivityChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ activityIndex: idx, 'form.activity_level': idx + 1 })
  },

  validate() {
    const { form } = this.data
    if (!form.real_name || form.real_name.length < 2 || form.real_name.length > 10) { showToast('请输入2-10字符的真实姓名'); return false }
    if (!form.gender) { showToast('请选择性别'); return false }
    const height = Number(form.height)
    if (!height || height < 100 || height > 250) { showToast('身高请输入100-250之间的数值'); return false }
    const weight = Number(form.weight)
    if (!weight || weight < 20 || weight > 200) { showToast('体重请输入20-200之间的数值'); return false }
    return true
  },

  async onSubmit() {

    const privacyOk = await requirePrivacyAgree('保存个人资料');
    if (!privacyOk) { return; }
      if (!this.validate() || this.data.submitting) return
    this.setData({ submitting: true })
    showLoading('保存中...')

    const openid = wx.getStorageSync('openid')
    const height = Number(this.data.form.height)
    const weight = Number(this.data.form.weight)
    const age = Number(this.data.form.age) || 25

    logger.info(TAG, 'onSubmit start cloudReady=', app.globalData.cloudReady,
      'openid=', openid, 'h=', height, 'w=', weight, 'g=', this.data.form.gender, 'isEdit=', this.data.isEdit)

    try {
      const nutritionTarget = calcNutritionTarget({
        gender: this.data.form.gender, height, weight, age, activity_level: this.data.form.activity_level
      })
      logger.info(TAG, 'onSubmit nutritionTarget energy=', nutritionTarget.energy?.value, 'protein=', nutritionTarget.protein?.value)

      if (app.globalData.cloudReady && !app.globalData.isGuest) {
        await this.saveToCloud(openid, height, weight, age, nutritionTarget)
      } else {
        logger.info(TAG, 'onSubmit cloud_not_ready save_local_only')
      }

      app.refreshNutritionTarget(nutritionTarget)

      const updatedUserInfo = {
        ...(localDB.getRaw('userInfo') || {}),
        nickname: this.data.form.nickname, real_name: this.data.form.real_name,
        gender: this.data.form.gender, height, weight, age, activity_level: this.data.form.activity_level
      }
      localDB.setRaw('userInfo', updatedUserInfo)
      app.globalData.userInfo = updatedUserInfo

      hideLoading(); showToast('资料保存成功', 'success')
      logger.info(TAG, 'onSubmit ok')
      setTimeout(() => {
        if (this.data.isEdit) wx.navigateBack()
        else wx.switchTab({ url: '/pages/diet/diet' })
      }, 800)
    } catch (err) {
      hideLoading()
      logger.error(TAG, 'onSubmit error', err.name, err.message, err.stack?.split('\n').slice(0, 3).join(' | '))
      showToast('保存失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  },

  async saveToCloud(openid, height, weight, age, nutritionTarget) {
    if (!app.globalData.cloudReady || app.globalData.isGuest) return false
    const db = wx.cloud.database()
    try {
      const userRes = await db.collection('user_info').where({ openid }).get()
      if (userRes.data.length === 0) {
        logger.warn(TAG, 'saveToCloud no user_info for openid=', openid)
        return false
      }
      const patch = {
        nickname: this.data.form.nickname,
        real_name: this.data.form.real_name,
        gender: this.data.form.gender,
        height, weight, age, activity_level: this.data.form.activity_level,
        update_time: db.serverDate()
      }
      if (nutritionTarget) patch.nutrition_target = nutritionTarget
      await db.collection('user_info').doc(userRes.data[0]._id).update({ data: patch })
      logger.info(TAG, 'saveToCloud ok height=', height, 'weight=', weight, 'hasNutritionTarget=', !!nutritionTarget)
      return true
    } catch (err) {
      logger.error(TAG, 'saveToCloud fail', err.message, err.errMsg)
      return false
    }
  }
})
