const app = getApp()
const logger = require('../../utils/logger.js')
const { showLoading, hideLoading, showToast, showModal, today } = require('../../utils/util.js')
const localDB = require('../../utils/cloud-storage.js')

const TAG = '[page:fitness]'

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function ensureCloud() {
  if (!app.globalData.cloudReady) return null
  return wx.cloud.database()
}

function buildGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了'
}

function buildDateParts() {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    todayNum: now.getDate(),
    todayYM: ym,
    todayWeek: WEEKDAY_CN[now.getDay()]
  }
}

Page({
  data: {
    weightRecords: [],
    fitnessRecords: [],
    weekStats: { days: 0, calories: 0, minutes: 0 },
    latestWeight: null,
    todayDate: '',
    cloudMode: false,
    showWeightModal: false,
    newWeight: '',
    greeting: '',
    todayNum: 1,
    todayYM: '',
    todayWeek: '',
    daysProgress: 0,
    calProgress: 0,
    minProgress: 0,
    weightSparkline: [],
    weightDiff: 0,
    allTrainingItems: [],
    showWeightHistory: false,
    weightEditMode: false,
    checkedWeightIds: [],
    _whAllChecked: false,
    weightGroups: [],
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSizes: [5, 10, 20, 50]
  },

  onLoad() {
    logger.info(TAG, 'onLoad cloudReady=', app.globalData.cloudReady)
    const dateParts = buildDateParts()
    this.setData({
      cloudMode: app.globalData.cloudReady,
      todayDate: today(),
      greeting: buildGreeting(),
      todayNum: dateParts.todayNum,
      todayYM: dateParts.todayYM,
      todayWeek: dateParts.todayWeek
    })
  },

  onShow() {
    logger.info(TAG, 'onShow')
    this.loadAllData()
  },

  loadAllData() {
    this.loadWeightRecords()
    this.loadPlansAndCalcStats()
  },

  loadWeightRecords() {
    try {
      const cloud = ensureCloud()
      const local = localDB.getAll(localDB.STORES.WEIGHT_RECORDS)

      const finish = (records) => {
        records.sort((a, b) => {
          const dateCmp = (b.record_date || '').localeCompare(a.record_date || '')
          if (dateCmp !== 0) return dateCmp
          return (b.record_id || '').localeCompare(a.record_id || '')
        })
        const latest = records.length > 0 ? records[0] : null
        const spark = this._buildSparkline(records)
        const diff = records.length >= 2
          ? (Number(records[0].weight) - Number(records[1].weight)).toFixed(1)
          : 0

        const countByDate = new Map()
        records.forEach(r => {
          const d = r.record_date || ''
          countByDate.set(d, (countByDate.get(d) || 0) + 1)
        })

        const ps = this.data.pageSize
        const totalPages = Math.max(1, Math.ceil(records.length / ps))
        const page = Math.min(this.data.currentPage, totalPages)
        const start = (page - 1) * ps
        const pageRecords = records.slice(start, start + ps)

        const groups = this._groupWeightByDay(pageRecords, countByDate)

        this.setData({
          weightRecords: pageRecords.map(r => ({ ...r, _checked: false })),
          latestWeight: latest,
          weightSparkline: spark,
          weightDiff: diff,
          weightGroups: groups,
          totalPages: totalPages,
          currentPage: page,
          totalRecords: records.length
        })
        logger.info(TAG, 'loadWeightRecords count=', records.length, 'page=', page + '/' + totalPages, 'diff=', diff)
      }

      if (cloud) {
        const openid = wx.getStorageSync('openid')
        cloud.collection('weight_record').where({ openid: openid || '' }).orderBy('record_date', 'desc').limit(200).get()
          .then(res => finish(res.data || []))
          .catch(err => {
            logger.warn(TAG, 'loadWeightRecords cloud fail, use local', err.errMsg)
            finish(local)
          })
      } else {
        finish(local)
      }
    } catch (err) {
      logger.error(TAG, 'loadWeightRecords error', err.message)
    }
  },

  _groupWeightByDay(records, countByDate) {
    const map = new Map()
    records.forEach(r => {
      const d = r.record_date || ''
      if (!map.has(d)) map.set(d, [])
      map.get(d).push({ ...r, _checked: false })
    })
    const groups = []
    const todayStr = today()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    map.forEach((items, date) => {
      let label = date
      if (date === todayStr) label = '今天 · ' + date
      else if (date === yesterday) label = '昨天 · ' + date
      const realCount = countByDate ? (countByDate.get(date) || items.length) : items.length
      groups.push({
        groupKey: date,
        date: date,
        label: label,
        items: items,
        realCount: realCount
      })
    })
    groups.sort((a, b) => b.date.localeCompare(a.date))
    return groups
  },

  _noop() {},

  _buildSparkline(records) {
    if (!records || records.length < 2) return []
    const latestN = records.slice(0, 8).reverse()
    const vals = latestN.map(r => Number(r.weight) || 0)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1
    return vals.map(v => Math.max(10, Math.round(((v - min) / range) * 100)))
  },

  loadPlansAndCalcStats() {
    try {
      const cloud = ensureCloud()
      const localPlans = localDB.getAll(localDB.STORES.FITNESS_PLANS)
      const localRecords = localDB.getAll(localDB.STORES.FITNESS_RECORDS)

      const finish = (plans, records) => {
        plans.sort((a, b) => (b.plan_date || '').localeCompare(a.plan_date || ''))

        const statsFromPlans = this._calcStatsFromPlans(plans)
        const statsFromRecords = this._calcStatsFromRecords(records)
        const weekStats = {
          days: new Set([
            ...this._getWeekDatesFromPlans(plans),
            ...this._getWeekDatesFromRecords(records)
          ]).size,
          calories: statsFromPlans.calories + statsFromRecords.calories,
          minutes: statsFromPlans.minutes + statsFromRecords.minutes
        }

        const planItems = plans
          .filter(p => p.status === 1 || (p.plan_date || '') === today())
          .slice(0, 10)
          .map(p => ({
            _type: 'plan',
            _time: p.create_time || 0,
            id: p.plan_id,
            name: p.plan_name,
            date: p.plan_date,
            status: p.status,
            items_count: p.items ? p.items.length : 0,
            calories: p.estimated_calories || 0
          }))

        const recordItems = records
          .slice(0, 20)
          .map(r => ({
            _type: 'record',
            _time: r.record_id ? Number(r.record_id.replace('fr_', '')) : 0,
            id: r.record_id,
            name: r.exercise_name || r.equipment_name || '训练记录',
            date: r.record_date,
            status: 1,
            record_type: r.record_type || 'strength',
            sets: r.sets,
            reps: r.reps,
            weight_kg: r.weight_kg,
            duration_min: r.duration_min,
            calories: r.calories_burned || 0
          }))

        const all = [...planItems, ...recordItems]
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          .slice(0, 5)

        this.setData({
          fitnessRecords: planItems.slice(0, 5),
          allTrainingItems: all,
          weekStats,
          daysProgress: Math.min(100, Math.round((weekStats.days / 7) * 100)),
          calProgress: Math.min(100, weekStats.calories > 0 ? 100 : 0),
          minProgress: Math.min(100, weekStats.minutes > 0 ? 100 : 0)
        })
        logger.info(TAG, 'loadPlansAndCalcStats plans=', plans.length, 'records=', records.length,
          'weekStats=', JSON.stringify(weekStats))
      }

      const loadPlans = () => new Promise(resolve => {
        if (cloud) {
          const openid = wx.getStorageSync('openid')
          cloud.collection('fitness_plan').where({ openid: openid || '' }).orderBy('plan_date', 'desc').limit(50).get()
            .then(res => resolve(res.data || []))
            .catch(() => { logger.warn(TAG, 'loadPlans cloud fail'); resolve(localPlans) })
        } else resolve(localPlans)
      })

      const loadRecords = () => new Promise(resolve => {
        if (cloud) {
          const openid = wx.getStorageSync('openid')
          cloud.collection('fitness_record').where({ openid: openid || '' }).orderBy('record_date', 'desc').limit(50).get()
            .then(res => resolve(res.data || []))
            .catch(() => resolve(localRecords))
        } else resolve(localRecords)
      })

      Promise.all([loadPlans(), loadRecords()])
        .then(([plans, records]) => finish(plans, records))
    } catch (err) {
      logger.error(TAG, 'loadPlansAndCalcStats error', err.message)
    }
  },

  _getWeekDatesFromPlans(plans) {
    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    return plans
      .filter(p => p.status === 1 && (p.plan_date || '') >= weekStart)
      .map(p => p.plan_date)
      .filter(Boolean)
  },

  _getWeekDatesFromRecords(records) {
    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    return records
      .filter(r => (r.record_date || '') >= weekStart)
      .map(r => r.record_date)
      .filter(Boolean)
  },

  _calcStatsFromRecords(records) {
    const todayStr = today()
    let calories = 0
    let minutes = 0
    for (const r of records) {
      if ((r.record_date || '') === todayStr) {
        calories += Number(r.calories_burned || 0)
        minutes += Number(r.duration_min || 0)
      }
    }
    return { calories: Math.round(calories), minutes: Math.round(minutes) }
  },

  _calcStatsFromPlans(plans) {
    const now = new Date()
    const todayStr = today()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    const weekStart = weekAgo.toISOString().slice(0, 10)

    const completed = plans.filter(p => p.status === 1)

    const weekCompleted = completed.filter(p => (p.plan_date || '') >= weekStart)
    const todayCompleted = completed.filter(p => (p.plan_date || '') === todayStr)

    const daysSet = new Set()
    for (const p of weekCompleted) {
      if (p.plan_date) daysSet.add(p.plan_date)
    }

    let calories = 0
    let minutes = 0
    for (const p of todayCompleted) {
      calories += Number(p.estimated_calories || 0)
      if (p.items && p.items.length > 0) {
        let totalMin = 0
        for (const it of p.items) {
          const sets = Number(it.sets) || 0
          if (it.equipment_type === 4) {
            const dur = Number(it.duration) || 60
            totalMin += sets * dur / 60
          } else {
            const rest = 2.5
            const repDur = 0.04
            const reps = Number(it.reps) || 10
            totalMin += sets * (reps * repDur + rest)
          }
        }
        minutes += Math.round(totalMin)
      } else {
        minutes += Number(p.total_sets || 0) * 3
      }
    }

    return {
      days: daysSet.size,
      calories: Math.round(calories),
      minutes: Math.round(minutes)
    }
  },

  showAddWeight() {
    this.setData({ showWeightModal: true, newWeight: '' })
  },

  closeWeightModal() {
    this.setData({ showWeightModal: false })
  },

  onWeightInput(e) {
    this.setData({ newWeight: e.detail.value })
  },

  confirmAddWeight() {
    const w = parseFloat(this.data.newWeight)
    if (!w || w < 20 || w > 300) {
      showToast('请输入有效体重(20-300kg)')
      return
    }

    const record = {
      record_id: 'w_' + Date.now(),
      record_date: today(),
      weight: w,
      source: 'manual'
    }

    try {
      localDB.add(localDB.STORES.WEIGHT_RECORDS, record)
      const cloud = ensureCloud()
      if (cloud) {
        const openid = wx.getStorageSync('openid')
        cloud.collection('weight_record').add({ data: { ...record, openid } }).catch(() => {})
      }
      this.setData({ showWeightModal: false })
      showToast('体重已记录')
      this.loadWeightRecords()
      logger.info(TAG, 'confirmAddWeight weight=', w)
    } catch (err) {
      logger.error(TAG, 'confirmAddWeight error', err.message)
      showToast('保存失败')
    }
  },

  showWeightHistory() {
    this.setData({ showWeightHistory: true, currentPage: 1 })
    this.loadWeightRecords()
  },

  prevWeightPage() {
    if (this.data.currentPage > 1) {
      this.setData({ currentPage: this.data.currentPage - 1, checkedWeightIds: [], _whAllChecked: false })
      this.loadWeightRecords()
    }
  },

  nextWeightPage() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({ currentPage: this.data.currentPage + 1, checkedWeightIds: [], _whAllChecked: false })
      this.loadWeightRecords()
    }
  },

  goWeightPage(e) {
    const p = parseInt(e.currentTarget.dataset.page)
    if (p >= 1 && p <= this.data.totalPages && p !== this.data.currentPage) {
      this.setData({ currentPage: p, checkedWeightIds: [], _whAllChecked: false })
      this.loadWeightRecords()
    }
  },

  changePageSize(e) {
    const idx = e.currentTarget.dataset.idx
    const ps = this.data.pageSizes[idx]
    this.setData({ pageSize: ps, currentPage: 1, checkedWeightIds: [], _whAllChecked: false })
    this.loadWeightRecords()
  },

  closeWeightHistory() {
    this.setData({ showWeightHistory: false, weightEditMode: false, checkedWeightIds: [] })
  },

  toggleWeightEdit() {
    if (this.data.weightEditMode) {
      const marked = this.data.weightRecords.map(r => ({ ...r, _checked: false }))
      const markedGroups = (this.data.weightGroups || []).map(g => ({
        ...g,
        items: g.items.map(r => ({ ...r, _checked: false }))
      }))
      this.setData({
        weightEditMode: false,
        checkedWeightIds: [],
        _whAllChecked: false,
        weightRecords: marked,
        weightGroups: markedGroups
      })
    } else {
      this.setData({
        weightEditMode: true,
        checkedWeightIds: [],
        _whAllChecked: false
      })
    }
  },

  toggleWeightCheck(e) {
    const id = e.currentTarget.dataset.id
    const checked = this.data.checkedWeightIds.slice()
    const idx = checked.indexOf(id)
    if (idx >= 0) {
      checked.splice(idx, 1)
    } else {
      checked.push(id)
    }
    const marked = this.data.weightRecords.map(r => ({
      ...r,
      _checked: checked.includes(r.record_id)
    }))
    const markedGroups = (this.data.weightGroups || []).map(g => ({
      ...g,
      items: g.items.map(r => ({ ...r, _checked: checked.includes(r.record_id) }))
    }))
    const allChecked = marked.length > 0 && marked.every(r => r._checked)
    this.setData({
      checkedWeightIds: checked,
      weightRecords: marked,
      weightGroups: markedGroups,
      _whAllChecked: allChecked
    })
  },

  toggleWeightCheckAll() {
    const newAll = !this.data._whAllChecked
    const marked = this.data.weightRecords.map(r => ({ ...r, _checked: newAll }))
    const checked = newAll ? this.data.weightRecords.map(r => r.record_id) : []
    const markedGroups = (this.data.weightGroups || []).map(g => ({
      ...g,
      items: g.items.map(r => ({ ...r, _checked: newAll }))
    }))
    this.setData({
      checkedWeightIds: checked,
      weightRecords: marked,
      weightGroups: markedGroups,
      _whAllChecked: newAll
    })
    wx.showToast({ title: newAll ? '已全选' : '已取消全选', icon: 'success' })
  },

  clearWeightCheck() {
    const marked = this.data.weightRecords.map(r => ({ ...r, _checked: false }))
    const markedGroups = (this.data.weightGroups || []).map(g => ({
      ...g,
      items: g.items.map(r => ({ ...r, _checked: false }))
    }))
    this.setData({
      checkedWeightIds: [],
      weightRecords: marked,
      weightGroups: markedGroups,
      _whAllChecked: false
    })
  },

  deleteWeightOne(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除这条体重记录？',
      confirmText: '删除',
      confirmColor: '#B91C1C',
      success: (m) => {
        if (!m.confirm) return
        this._deleteWeightRecords([id])
      }
    })
  },

  batchDeleteWeight() {
    const ids = this.data.checkedWeightIds
    if (ids.length === 0) { wx.showToast({ title: '请先选择', icon: 'none' }); return }
    wx.showModal({
      title: '确认批量删除',
      content: `将删除 ${ids.length} 条体重记录，此操作不可恢复。继续？`,
      confirmText: '批量删除',
      confirmColor: '#B91C1C',
      success: (m) => {
        if (!m.confirm) return
        this._deleteWeightRecords(ids)
      }
    })
  },

  _deleteWeightRecords(ids) {
    try {
      const cloud = ensureCloud()
      const openid = wx.getStorageSync('openid')
      ids.forEach(id => {
        localDB.remove(localDB.STORES.WEIGHT_RECORDS, 'record_id', id)
        if (cloud) {
          cloud.collection('weight_record').where({ record_id: id, openid: openid || '' }).remove().catch(() => {})
        }
      })
      wx.showToast({ title: `已删除 ${ids.length} 条`, icon: 'success' })
      this.setData({ checkedWeightIds: [], _whAllChecked: false })
      this.loadWeightRecords()
    } catch (err) {
      logger.error(TAG, '_deleteWeightRecords error', err.message)
      showToast('删除失败')
    }
  },

  goEquipment() {
    wx.navigateTo({ url: '/pages/equipment/equipment' })
  },

  goPlanCreate() {
    wx.navigateTo({ url: '/pages/plan-create/plan-create' })
  },

  goCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar' })
  },

  openClearMenu() {
    wx.showActionSheet({
      itemList: ['清理自动计划 + 训练记录', '只清理训练记录', '清空所有计划和记录'],
      itemColor: '#B91C1C',
      success: (res) => {
        const modes = ['auto_and_records', 'records_only', 'all']
        const mode = modes[res.tapIndex]
        const labels = {
          auto_and_records: '自动创建的计划和训练记录',
          records_only: '训练记录',
          all: '所有计划和训练记录'
        }
        wx.showModal({
          title: '确认清理',
          content: `将清空${labels[mode]}，此操作不可恢复。继续？`,
          confirmText: '确认清理',
          confirmColor: '#B91C1C',
          success: (m) => {
            if (!m.confirm) return
            const result = app.clearTrainingData(mode)
            wx.showToast({
              title: `已清理 ${result.plansCleared} 个计划 ${result.recordsCleared} 条记录`,
              icon: 'success',
              duration: 2000
            })
            this.loadAllData()
          }
        })
      }
    })
  }
})
