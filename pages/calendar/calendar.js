const app = getApp()
const logger = require('../../utils/logger.js')
const { showLoading, hideLoading, showToast, showModal, today } = require('../../utils/util.js')
const localDB = require('../../utils/cloud-storage.js')

const TAG = '[page:calendar]'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const STATUS_MAP = { 0: '待执行', 1: '已完成', 2: '已跳过', 3: '已逾期' }

function ensureCloud() {
  if (!app.globalData.cloudReady) return null
  return wx.cloud.database()
}

Page({
  data: {
    year: 0,
    month: 0,
    weekDays: WEEKDAYS,
    calendarDays: [],
    selectedDate: '',
    selectedTab: 'plans',
    selectedPlans: [],
    allPlans: [],
    templates: [],
    statusMap: STATUS_MAP,
    showDetail: false,
    detailPlan: null,
    editMode: false,
    checkedPlanIds: [],
    checkedTplIds: [],
    cloudMode: false
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const todayStr = today()
    this.setData({
      cloudMode: app.globalData.cloudReady,
      year: y,
      month: m,
      selectedDate: todayStr
    })
    this.buildCalendar()
  },

  onShow() {
    logger.info(TAG, 'onShow')
    if (this.data.year) this.loadAll()
  },

  buildCalendar() {
    const { year, month, selectedDate } = this.data
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, date, isSelected: date === selectedDate })
    }
    while (cells.length % 7 !== 0) cells.push(null)
    this.setData({ calendarDays: cells }, () => this._markPlansOnCalendar())
  },

  _markPlansOnCalendar() {
    const { calendarDays, allPlans, selectedDate } = this.data
    const days = calendarDays.map(cell => {
      if (!cell) return null
      const plansOnDay = allPlans.filter(p => (p.plan_date || '').substring(0, 10) === cell.date)
      const status = this._planStatusForDay(plansOnDay)
      return {
        ...cell,
        isSelected: cell.date === selectedDate,
        hasPlan: plansOnDay.length > 0,
        planCount: plansOnDay.length,
        status
      }
    })
    this.setData({ calendarDays: days })
  },

  _planStatusForDay(plans) {
    if (!plans || plans.length === 0) return -1
    if (plans.some(p => p.status === 1)) return 1
    if (plans.some(p => p.status === 0)) return 0
    return 2
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
      this._markPlansOnCalendar()
      this._filterSelectedPlans()
    })
  },

  selectTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      selectedTab: tab,
      editMode: false,
      checkedPlanIds: [],
      checkedTplIds: [],
      selectedPlans: this.data.selectedPlans.map(p => ({ ...p, _selected: false })),
      templates: this.data.templates.map(t => ({ ...t, _selected: false }))
    })
  },

  toggleEditMode() {
    const next = !this.data.editMode
    this.setData({
      editMode: next,
      checkedPlanIds: [],
      checkedTplIds: [],
      selectedPlans: this.data.selectedPlans.map(p => ({ ...p, _selected: false })),
      templates: this.data.templates.map(t => ({ ...t, _selected: false }))
    })
  },

  toggleCheckPlan(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.checkedPlanIds
    const idx = list.indexOf(id)
    let next
    if (idx >= 0) next = list.filter(x => x !== id)
    else next = [...list, id]
    this.setData({
      checkedPlanIds: next,
      selectedPlans: this.data.selectedPlans.map(p => ({
        ...p,
        _selected: next.indexOf(p.plan_id) >= 0
      }))
    })
  },

  toggleCheckTpl(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.checkedTplIds
    const idx = list.indexOf(id)
    let next
    if (idx >= 0) next = list.filter(x => x !== id)
    else next = [...list, id]
    this.setData({
      checkedTplIds: next,
      templates: this.data.templates.map(t => ({
        ...t,
        _selected: next.indexOf(t.template_id) >= 0
      }))
    })
  },

  checkAllPlans() {
    const all = this.data.selectedPlans.map(p => p.plan_id)
    const isAll = this.data.checkedPlanIds.length === all.length
    if (all.length === 0) {
      showToast('当前没有计划')
      return
    }
    const nextIds = isAll ? [] : all
    this.setData({
      checkedPlanIds: nextIds,
      selectedPlans: this.data.selectedPlans.map(p => ({
        ...p,
        _selected: nextIds.indexOf(p.plan_id) >= 0
      }))
    }, () => {
      showToast(isAll ? '已取消全选' : `已全选 ${all.length} 项`, 'success')
    })
  },

  checkAllTpls() {
    const all = this.data.templates.map(t => t.template_id)
    const isAll = this.data.checkedTplIds.length === all.length
    if (all.length === 0) {
      showToast('当前没有模板')
      return
    }
    const nextIds = isAll ? [] : all
    this.setData({
      checkedTplIds: nextIds,
      templates: this.data.templates.map(t => ({
        ...t,
        _selected: nextIds.indexOf(t.template_id) >= 0
      }))
    }, () => {
      showToast(isAll ? '已取消全选' : `已全选 ${all.length} 项`, 'success')
    })
  },

  async loadAll() {
    showLoading()
    try {
      await Promise.all([this._loadPlans(), this._loadTemplates()])
      this._markPlansOnCalendar()
      this._filterSelectedPlans()
    } catch (err) {
      logger.error(TAG, 'loadAll error', err.message)
    }
    hideLoading()
  },

  async _loadPlans() {
    const cloud = ensureCloud()
    try {
      let list = []
      if (cloud) {
        const openid = wx.getStorageSync('openid')
        const res = await cloud.collection('fitness_plan').where({ openid: openid || '' }).orderBy('create_time', 'desc').get()
        list = res.data || []
      } else {
        list = localDB.getAll(localDB.STORES.FITNESS_PLANS).sort((a, b) => (b.create_time || 0) - (a.create_time || 0))
      }
      this.setData({ allPlans: list })
      logger.info(TAG, '_loadPlans count=', list.length, 'cloud=', !!cloud)
    } catch (err) {
      logger.warn(TAG, '_loadPlans cloud fail, use local', err.errMsg || err.message)
      const list = localDB.getAll(localDB.STORES.FITNESS_PLANS).sort((a, b) => (b.create_time || 0) - (a.create_time || 0))
      this.setData({ allPlans: list })
    }
  },

  async _loadTemplates() {
    try {
      const { checkedTplIds } = this.data
      const list = localDB.getAll(localDB.STORES.PLAN_TEMPLATES)
        .sort((a, b) => (b.create_time || 0) - (a.create_time || 0))
        .map(t => ({
          ...t,
          _selected: checkedTplIds.indexOf(t.template_id) >= 0
        }))
      this.setData({ templates: list })
      logger.info(TAG, '_loadTemplates count=', list.length)
    } catch (err) {
      logger.warn(TAG, '_loadTemplates fail', err.message)
    }
  },

  _filterSelectedPlans() {
    const { allPlans, selectedDate, checkedPlanIds } = this.data
    const filtered = allPlans
      .filter(p => (p.plan_date || '').substring(0, 10) === selectedDate)
      .map(p => ({
        ...p,
        _selected: checkedPlanIds.indexOf(p.plan_id) >= 0
      }))
    this.setData({ selectedPlans: filtered })
  },

  viewPlan(e) {
    if (this.data.editMode) return
    const id = e.currentTarget.dataset.id
    const plan = this.data.allPlans.find(p => p.plan_id === id || p._id === id)
    if (!plan) return
    this.setData({ detailPlan: plan, showDetail: true })
  },

  closeDetail() {
    this.setData({ showDetail: false, detailPlan: null })
  },

  async completePlan(e) {
    const id = e.currentTarget.dataset.id
    const plan = this.data.allPlans.find(p => p.plan_id === id || p._id === id)
    if (!plan) {
      logger.warn(TAG, 'completePlan: plan not found id=', id)
      showToast('计划不存在')
      return
    }

    logger.info(TAG, 'completePlan id=', id, 'plan_id=', plan.plan_id, 'current status=', plan.status)
    const cloud = ensureCloud()

    try {
      if (cloud && plan._id) {
        await cloud.collection('fitness_plan').doc(plan._id).update({ data: { status: 1 } })
      } else {
        const ok = localDB.update(localDB.STORES.FITNESS_PLANS, 'plan_id', plan.plan_id, { status: 1 })
        logger.info(TAG, 'localDB.update result=', ok)
        if (!ok) {
          showToast('更新失败：找不到该计划')
          return
        }
      }
      showToast('已完成', 'success')
      await this.loadAll()
    } catch (err) {
      logger.error(TAG, 'completePlan error', err.message)
      showToast('操作失败')
    }
  },

  async deletePlan(e) {
    const id = e.currentTarget.dataset.id
    const plan = this.data.allPlans.find(p => p.plan_id === id || p._id === id)
    if (!plan) return

    const ok = await showModal('确认删除', `确定要删除计划「${plan.plan_name}」吗？`)
    if (!ok) return

    const cloud = ensureCloud()
    try {
      if (cloud && plan._id) {
        await cloud.collection('fitness_plan').doc(plan._id).remove()
      } else {
        localDB.remove(localDB.STORES.FITNESS_PLANS, 'plan_id', plan.plan_id)
      }
      showToast('已删除', 'success')
      await this.loadAll()
    } catch (err) {
      logger.error(TAG, 'deletePlan error', err.message)
      showToast('删除失败')
    }
  },

  async batchDeletePlans() {
    const ids = this.data.checkedPlanIds
    if (ids.length === 0) {
      showToast('请先勾选要删除的计划')
      return
    }

    const ok = await showModal('确认删除', `确定要删除选中的 ${ids.length} 个计划吗？此操作不可恢复`)
    if (!ok) return

    const cloud = ensureCloud()
    let success = 0
    for (const id of ids) {
      const plan = this.data.allPlans.find(p => p.plan_id === id || p._id === id)
      if (!plan) continue
      try {
        if (cloud && plan._id) {
          await cloud.collection('fitness_plan').doc(plan._id).remove()
        } else {
          localDB.remove(localDB.STORES.FITNESS_PLANS, 'plan_id', plan.plan_id)
        }
        success++
      } catch (err) {
        logger.warn(TAG, 'batchDeletePlans fail id=', id, err.message)
      }
    }

    showToast(`已删除 ${success} 个`, 'success')
    this.setData({ editMode: false, checkedPlanIds: [] })
    await this.loadAll()
  },

  async deleteTemplate(e) {
    const id = e.currentTarget.dataset.id
    const tpl = this.data.templates.find(t => t.template_id === id)
    if (!tpl) return

    const ok = await showModal('确认删除', `确定要删除模板「${tpl.name}」吗？`)
    if (!ok) return

    localDB.remove(localDB.STORES.PLAN_TEMPLATES, 'template_id', id)
    showToast('已删除')
    await this._loadTemplates()
  },

  async batchDeleteTpls() {
    const ids = this.data.checkedTplIds
    if (ids.length === 0) {
      showToast('请先勾选要删除的模板')
      return
    }

    const ok = await showModal('确认删除', `确定要删除选中的 ${ids.length} 个模板吗？此操作不可恢复`)
    if (!ok) return

    for (const id of ids) {
      localDB.remove(localDB.STORES.PLAN_TEMPLATES, 'template_id', id)
    }
    showToast(`已删除 ${ids.length} 个`, 'success')
    this.setData({ editMode: false, checkedTplIds: [] })
    await this._loadTemplates()
  },

  goCreatePlan() {
    wx.navigateTo({ url: '/pages/plan-create/plan-create' })
  },

  useTemplate(e) {
    if (this.data.editMode) return
    const id = e.currentTarget.dataset.id
    const tpl = this.data.templates.find(t => t.template_id === id)
    if (!tpl || !tpl.items || tpl.items.length === 0) {
      showToast('模板内容为空')
      return
    }
    const ids = tpl.items.map(i => i.equipment_id).join(',')
    const date = this.data.selectedDate || today()
    const baseName = tpl.name || '训练计划'
    const cleanName = baseName.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim()
    const planName = (cleanName || '训练计划') + ' ' + date
    wx.navigateTo({
      url: '/pages/plan-create/plan-create?equipment_ids=' + ids + '&plan_date=' + date + '&plan_name=' + encodeURIComponent(planName)
    })
  }
})
