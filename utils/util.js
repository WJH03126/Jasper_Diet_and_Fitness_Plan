const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTime = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const formatTime = (date) => {
  const d = new Date(date)
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

const today = (date) => formatDate(date || new Date())

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

const calcAge = (birthDate) => {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const checkNutritionStatus = (current, min, max) => {
  if (current < min) return '不足'
  if (current > max) return '超标'
  return '达标'
}

const calcNutritionPercent = (current, min, max) => {
  if (!max) return 0
  const percent = (current / max) * 100
  return Math.min(percent, 150)
}

const getStatusClass = (status) => {
  switch (status) {
    case '达标': return 'success'
    case '不足': return 'warning'
    case '超标': return 'danger'
    default: return ''
  }
}

const round = (num, decimals = 1) => {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

const generateId = () => {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
}

const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true })
}

const hideLoading = () => {
  wx.hideLoading()
}

const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 })
}

const showModal = (title, content, options = {}) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#10B981',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
      ...options
    })
  })
}

const PRIVACY_SUMMARY = '【协议核心要点】\n• 本小程序为健康管理工具，不构成医疗建议\n• 个人数据存储在本地，不会上传服务器\n• 可在「我的」页面随时查看完整协议\n• 退出游客模式将清空所有本地数据\n\n点击「同意」即表示您已阅读并同意《用户服务协议》和《隐私政策》。'

const requirePrivacyAgree = async (content) => {
  if (wx.getStorageSync('privacy_agreed') === true) return true
  const ok = await showModal('请先同意协议', PRIVACY_SUMMARY, { confirmText: '同意', cancelText: '暂不使用' })
  if (ok) {
    wx.setStorageSync('privacy_agreed', true)
    return true
  }
  return false
}

const primaryPartMap = {
  1: '胸部',
  2: '背部',
  3: '肩部',
  4: '手臂',
  5: '腿部',
  6: '核心',
  7: '热身'
}

const equipmentTypeMap = {
  1: '自由重量',
  2: '固定器械',
  3: '绳索器械',
  4: '自重',
  5: '弹力绳'
}

const mealTypeMap = {
  1: '早餐',
  2: '午餐',
  3: '晚餐'
}

const activityLevelMap = {
  1: '轻体力活动',
  2: '中体力活动',
  3: '重体力活动'
}

const PAL_MAP = {
  1: 1.375,
  2: 1.55,
  3: 1.725
}

const calcBMR = (gender, height, weight, age) => {
  if (!height || !weight || !age) return 0
  const h = Number(height), w = Number(weight), a = Number(age)
  if (gender === 1) return 10 * w + 6.25 * h - 5 * a + 5
  return 10 * w + 6.25 * h - 5 * a - 161
}

const range = (mid, pct = 0.1) => ({
  min: Math.round(mid * (1 - pct)),
  max: Math.round(mid * (1 + pct)),
  value: Math.round(mid)
})

const calcNutritionTarget = ({ gender, height, weight, age = 25, activity_level = 1 }) => {
  const bmr = calcBMR(gender, height, weight, age)
  const pal = PAL_MAP[activity_level] || 1.375
  const tdee = bmr * pal

  const energy = Math.round(tdee)
  const protein = Math.round(weight * 1.8)
  const fat = Math.round((tdee * 0.25) / 9)
  const carb = Math.round((tdee - protein * 4 - fat * 9) / 4)
  const fiber = 25
  const salt = 5

  return {
    version: '1.0-local',
    bmr: Math.round(bmr),
    tdee: energy,
    energy: range(energy, 0.08),
    protein: range(protein, 0.15),
    fat: range(fat, 0.15),
    carb: range(carb, 0.15),
    fiber: range(fiber, 0.1),
    salt: range(salt, 0),
    activity_level,
    pal,
    method: 'mifflin-st-jeor'
  }
}

module.exports = {
  formatDate,
  formatDateTime,
  formatTime,
  today,
  daysInMonth,
  firstDayOfMonth,
  calcAge,
  checkNutritionStatus,
  calcNutritionPercent,
  getStatusClass,
  round,
  generateId,
  showLoading,
  hideLoading,
  showToast,
  showModal,
  requirePrivacyAgree,
  primaryPartMap,
  equipmentTypeMap,
  mealTypeMap,
  activityLevelMap,
  PAL_MAP,
  calcBMR,
  calcNutritionTarget
}
