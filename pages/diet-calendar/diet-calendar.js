const app = getApp()
const logger = require('../../utils/logger.js')
const { today, checkNutritionStatus, calcNutritionPercent, getStatusClass, round, mealTypeMap } = require('../../utils/util.js')

const TAG = '[page:diet-calendar]'
const LOCAL_RECORDS_KEY = 'local_diet_records'
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function toDateStr(v) {
  if (!v) return ''
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  return String(v).substring(0, 10)
}

Page({
  data: {
    year: 0,
    month: 0,
    weekDays: WEEKDAYS,
    calendarDays: [],
    selectedDate: '',
    target: {
      energy: { min: 1200, max: 2000 },
      protein: { min: 60, max: 100 },
      fat: { min: 40, max: 70 },
      carb: { min: 150, max: 250 },
      fiber: { min: 25, max: 30 },
      salt: { min: 0, max: 5 }
    },
    detailRecords: [],
    mergedDetailRecords: [],
    totalIntake: { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0 },
    mealSplit: { breakfast: 0, lunch: 0, dinner: 0 },
    nutritionItems: [],
    energyPercent: 0,
    energyStatus: '',
    energyStatusClass: '',
    mealTypeMap
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    this.loadTarget()
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const todayStr = today()
    this.setData({
      year: y,
      month: m,
      selectedDate: todayStr
    })
    this.buildCalendar()
  },

  onShow() {
    logger.info(TAG, 'onShow selectedDate=', this.data.selectedDate)
    if (this.data.year) {
      this.loadTarget()
      this.buildCalendar()
    }
  },

  loadTarget() {
    const s = wx.getStorageSync('nutritionTarget')
    if (s) {
      this.setData({ target: { ...this.data.target, ...s } })
    }
  },

  buildCalendar() {
    const { year, month, selectedDate } = this.data
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayStr = today()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        day: d,
        date,
        isToday: date === todayStr,
        isSelected: date === selectedDate
      })
    }
    while (cells.length % 7 !== 0) cells.push(null)
    this.setData({ calendarDays: cells }, () => {
      this._markDaysEnergy()
    })
  },

  getLocalRecordsByMonth(monthPrefix) {
    const all = wx.getStorageSync(LOCAL_RECORDS_KEY) || []
    return all.filter(r => {
      const d = toDateStr(r.record_date || r.recordDate)
      return d.startsWith(monthPrefix)
    })
  },

  getLocalRecordsByDate(date) {
    const all = wx.getStorageSync(LOCAL_RECORDS_KEY) || []
    return all.filter(r => {
      const d = toDateStr(r.record_date || r.recordDate)
      return d === date
    })
  },

  async _fetchCloudRecordsByMonth(year, month) {
    const openid = wx.getStorageSync('openid')
    if (!openid) return []
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('user_info').where({ openid }).get()
      const user_id = userRes.data[0]?.user_id
      if (!user_id) return []
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59)
      const res = await db.collection('diet_record')
        .where({
          user_id,
          record_date: db.command.and([
            db.command.gte(firstDay),
            db.command.lte(lastDay)
          ])
        })
        .limit(1000)
        .get()
      return res.data || []
    } catch (e) {
      logger.warn(TAG, '_fetchCloudRecordsByMonth fail', e.message)
      return []
    }
  },

  async _fetchCloudRecordsByDate(date) {
    const openid = wx.getStorageSync('openid')
    if (!openid) return []
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('user_info').where({ openid }).get()
      const user_id = userRes.data[0]?.user_id
      if (!user_id) return []
      const res = await db.collection('diet_record')
        .where({ user_id, record_date: db.command.eq(new Date(date)) })
        .orderBy('meal_type', 'asc').get()
      return res.data || []
    } catch (e) {
      logger.warn(TAG, '_fetchCloudRecordsByDate fail', e.message)
      return []
    }
  },

  _mergeRecords(a, b) {
    const map = new Map()
    ;[...a, ...b].forEach(r => {
      const k = r.record_id || r._id || JSON.stringify(r)
      if (!map.has(k)) map.set(k, r)
    })
    return Array.from(map.values())
  },

  async _markDaysEnergy() {
    const { calendarDays, target } = this.data
    const energyMax = target.energy.max || 2000
    const monthPrefix = `${this.data.year}-${String(this.data.month + 1).padStart(2, '0')}`

    let cloudRecords = []
    let localRecords = []
    try {
      localRecords = this.getLocalRecordsByMonth(monthPrefix)
      if (app.globalData.cloudReady) {
        cloudRecords = await this._fetchCloudRecordsByMonth(this.data.year, this.data.month)
        logger.info(TAG, '_markDaysEnergy cloud=', cloudRecords.length, 'local=', localRecords.length)
      }
    } catch (err) {
      logger.warn(TAG, '_markDaysEnergy fail', err.message)
    }
    const records = this._mergeRecords(cloudRecords, localRecords)

    const map = {}
    records.forEach(r => {
      const d = toDateStr(r.record_date || r.recordDate)
      if (!d) return
      if (!map[d]) map[d] = { energy: 0, count: 0 }
      map[d].energy += Number(r.energy) || 0
      map[d].count += 1
    })

    const selDate = this.data.selectedDate
    const days = calendarDays.map(c => {
      if (!c) return null
      const info = map[c.date]
      let energyStatus = 'none'
      if (info && info.count > 0) {
        if (info.energy < energyMax * 0.6) energyStatus = 'low'
        else if (info.energy <= energyMax * 1.15) energyStatus = 'ok'
        else energyStatus = 'high'
      }
      return {
        ...c,
        isSelected: c.date === selDate,
        energy: info ? Math.round(info.energy) : 0,
        foodCount: info ? info.count : 0,
        energyStatus
      }
    })
    this.setData({ calendarDays: days })
    this.loadDetailRecords()
  },

  prevMonth() {
    let { year, month } = this.data
    month--
    if (month < 0) { month = 11; year-- }
    this.setData({ year, month }, () => this.buildCalendar())
  },

  nextMonth() {
    let { year, month } = this.data
    month++
    if (month > 11) { month = 0; year++ }
    this.setData({ year, month }, () => this.buildCalendar())
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    logger.info(TAG, 'selectDate=', date)
    this.setData({ selectedDate: date }, () => {
      this._markDaysEnergy()
    })
  },

  async loadDetailRecords() {
    const date = this.data.selectedDate
    if (!date) return
    let cloudRecords = []
    let localRecords = []
    try {
      localRecords = this.getLocalRecordsByDate(date)
      if (app.globalData.cloudReady) {
        cloudRecords = await this._fetchCloudRecordsByDate(date)
        logger.info(TAG, 'loadDetailRecords cloud=', cloudRecords.length, 'local=', localRecords.length)
      }
    } catch (err) {
      logger.warn(TAG, 'loadDetailRecords fetch fail', err.message)
    }
    try {
      const records = this._mergeRecords(cloudRecords, localRecords)
      logger.info(TAG, 'loadDetailRecords merged=', records.length)
      const normalized = records.map(r => this.normalizeRecord(r))
      const merged = this.mergeRecords(normalized)
      this.calcIntake(normalized)
      this.setData({ detailRecords: normalized, mergedDetailRecords: merged })
    } catch (err) {
      logger.error(TAG, 'loadDetailRecords render fail', err.message)
      this.calcIntake([])
      this.setData({ detailRecords: [], mergedDetailRecords: [] })
    }
  },

  normalizeRecord(r) {
    const rawDate = r.record_date || r.recordDate || ''
    const fmtDate = toDateStr(rawDate)
    return {
      ...r,
      meal_type: Number(r.meal_type) || Number(r.mealType) || 0,
      food_name: r.food_name || r.foodName || r.name || '',
      record_date: fmtDate,
      weight: Math.round(Number(r.weight != null ? r.weight : (r.weight_g != null ? r.weight_g : 0))),
      energy: Math.round(Number(r.energy != null ? r.energy : (r.energy_kcal != null ? r.energy_kcal : 0))),
      protein: round(Number(r.protein != null ? r.protein : (r.protein_g != null ? r.protein_g : 0))),
      fat: round(Number(r.fat != null ? r.fat : (r.fat_g != null ? r.fat_g : 0))),
      carb: round(Number(r.carb != null ? r.carb : (r.carb_g != null ? r.carb_g : 0))),
      fiber: round(Number(r.fiber != null ? r.fiber : (r.fiber_g != null ? r.fiber_g : 0))),
      salt: round(Number(r.salt != null ? r.salt : (r.salt_g != null ? r.salt_g : 0)), 2)
    }
  },

  mergeRecords(rawRecords) {
    const groups = new Map()
    rawRecords.forEach(r => {
      const key = (r.food_id || '') + '|' + (Number(r.meal_type) || 0)
      if (!groups.has(key)) {
        groups.set(key, {
          record_id: r.record_id,
          meal_type: Number(r.meal_type) || 0,
          food_name: r.food_name || r.name || '',
          weight: 0, energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0,
          count: 0, _ids: []
        })
      }
      const g = groups.get(key)
      g.weight += Number(r.weight) || 0
      g.energy += Number(r.energy) || 0
      g.protein += Number(r.protein) || 0
      g.fat += Number(r.fat) || 0
      g.carb += Number(r.carb) || 0
      g.fiber += Number(r.fiber) || 0
      g.salt += Number(r.salt) || 0
      g.count += 1
      g._ids.push(r.record_id)
    })
    return Array.from(groups.values()).map(g => ({
      ...g,
      weight: Math.round(g.weight),
      energy: Math.round(g.energy),
      protein: round(g.protein),
      fat: round(g.fat),
      carb: round(g.carb),
      fiber: round(g.fiber),
      salt: round(g.salt, 2)
    }))
  },

  calcIntake(records) {
    const target = this.data.target
    const total = { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0 }
    const split = { breakfast: 0, lunch: 0, dinner: 0 }
    records.forEach(r => {
      const mt = Number(r.meal_type) || 0
      const e = Number(r.energy) || 0
      total.energy += e
      total.protein += Number(r.protein) || 0
      total.fat += Number(r.fat) || 0
      total.carb += Number(r.carb) || 0
      total.fiber += Number(r.fiber) || 0
      total.salt += Number(r.salt) || 0
      if (mt === 1) split.breakfast += e
      else if (mt === 2) split.lunch += e
      else if (mt === 3) split.dinner += e
    })
    const keys = ['energy', 'protein', 'fat', 'carb', 'fiber', 'salt']
    const labels = { energy: '能量(kcal)', protein: '蛋白质(g)', fat: '脂肪(g)', carb: '碳水(g)', fiber: '膳食纤维(g)', salt: '盐(g)' }
    const units = { energy: '', protein: 'g', fat: 'g', carb: 'g', fiber: 'g', salt: 'g' }
    const items = []
    let energyStatus = '', energyStatusClass = ''
    keys.forEach(key => {
      const t = target[key] || { min: 0, max: 0 }
      const s = checkNutritionStatus(total[key], t.min, t.max)
      const pct = Math.min(calcNutritionPercent(total[key], t.min, t.max), 100)
      items.push({
        key, label: labels[key], current: round(total[key]),
        min: t.min, max: t.max, unit: units[key],
        status: s, statusClass: getStatusClass(s),
        percent: pct
      })
      if (key === 'energy') { energyStatus = s; energyStatusClass = getStatusClass(s) }
    })
    const eMax = target.energy.max || 2000
    const energyPercent = Math.min((total.energy / eMax) * 360, 360)
    this.setData({
      totalIntake: { energy: round(total.energy), protein: round(total.protein), fat: round(total.fat), carb: round(total.carb), fiber: round(total.fiber), salt: round(total.salt, 2) },
      mealSplit: split,
      nutritionItems: items,
      energyPercent,
      energyStatus,
      energyStatusClass
    })
  },

  goDietAdd() {
    const date = this.data.selectedDate || today()
    wx.setStorageSync('pending_diet_date', date)
    wx.switchTab({ url: '/pages/diet/diet' })
  }
})
