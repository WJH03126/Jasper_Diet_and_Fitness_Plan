const app = getApp()
const logger = require('../../utils/logger.js')
const {showLoading, hideLoading, showToast, showModal, today, requirePrivacyAgree} = require('../../utils/util.js')
const localDB = require('../../utils/cloud-storage.js')
const EQUIPMENTS = require('../../data/equipment')
const EXERCISE = require('../../data/exercise')

const TAG = '[page:plan-create]'

function ensureCloud() {
  if (!app.globalData.cloudReady || app.globalData.isGuest) return null
  return wx.cloud.database()
}

function buildItem(eq, exercise) {
  return {
    equipment_id: eq.equipment_id,
    name: exercise?.name || eq.name,
    equipment_name: eq.name,
    primary_part: eq.primary_part,
    muscle_group: eq.muscle_group || exercise?.muscle_group,
    equipment_type: eq.equipment_type,
    weight: eq.equipment_type !== 4 ? 30 : undefined,
    sets: 3,
    reps: eq.equipment_type !== 4 ? 12 : undefined,
    duration: eq.equipment_type === 4 ? 60 : undefined,
    calories_per_minute: exercise?.calories_per_minute || 0.15
  }
}

Page({
  data: {
    planName: '',
    planDate: '',
    remindTime: '08:00',
    remindEnabled: false,
    planItems: [],
    totalSets: 0,
    totalReps: 0,
    estimatedCalories: 0,
    saving: false,
    showExercisePicker: false,
    exerciseKeyword: '',
    exerciseFilter: 0,
    filteredExercises: [],
    exerciseParts: [
      { id: 0, name: '全部' },
      { id: 1, name: '胸部' },
      { id: 2, name: '背部' },
      { id: 3, name: '肩部' },
      { id: 4, name: '手臂' },
      { id: 5, name: '腿部' },
      { id: 6, name: '核心' }
    ]
  },

  onLoad(options) {
    const opt = options || {}
    const defDate = opt.plan_date || today()
    let defName = opt.plan_name ? decodeURIComponent(opt.plan_name) : '训练计划 ' + defDate
    this.setData({ planDate: defDate, planName: defName })

    if (opt.equipment_ids) {
      const ids = opt.equipment_ids.split(',').filter(Boolean)
      logger.info(TAG, 'onLoad equipment_ids count=', ids.length, 'plan_date=', defDate, 'plan_name=', defName)
      this._loadEquipments(ids)
    } else {
      logger.info(TAG, 'onLoad no equipment_ids')
    }
  },

  onShow() {
    const ids = wx.getStorageSync('eq_to_add')
    if (!ids || !Array.isArray(ids) || ids.length === 0) return

    wx.removeStorageSync('eq_to_add')
    logger.info(TAG, 'onShow merge eq_to_add count=', ids.length)

    const existingIds = new Set(this.data.planItems.map(i => i.equipment_id))
    const newIds = ids.filter(id => !existingIds.has(id))
    if (newIds.length === 0) return

    const newItems = this._buildItems(newIds)
    const merged = [...this.data.planItems, ...newItems]
    this.setData({ planItems: merged }, () => {
      this._calcSummary()
      showToast(`已添加 ${newItems.length} 项`, 'success')
    })
  },

  _buildItems(ids) {
    return ids.map(id => {
      const eq = EQUIPMENTS.find(e => e.equipment_id === id)
      if (!eq) return null
      const ex = EXERCISE.find(e => e.equipment_type === eq.equipment_type &&
        (eq.muscle_group ? e.muscle_group?.includes(eq.muscle_group.slice(0, 2)) : true))
      return buildItem(eq, ex)
    }).filter(Boolean)
  },

  _loadEquipments(ids) {
    const items = this._buildItems(ids)
    this.setData({ planItems: items }, () => this._calcSummary())
    logger.info(TAG, '_loadEquipments loaded=', items.length)
  },

  _calcSummary() {
    let totalSets = 0
    let totalReps = 0
    let estimatedCalories = 0
    for (const it of this.data.planItems) {
      totalSets += Number(it.sets) || 0
      if (it.reps !== undefined) totalReps += (Number(it.reps) || 0) * (Number(it.sets) || 0)
      const durationMin = (it.sets || 0) * ((it.duration || 60) / 60)
      estimatedCalories += durationMin * (Number(it.calories_per_minute) || 0.15)
    }
    this.setData({
      totalSets,
      totalReps,
      estimatedCalories: Math.round(estimatedCalories)
    })
  },

  onNameInput(e) {
    this.setData({ planName: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ planDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ remindTime: e.detail.value })
  },

  onRemindToggle(e) {
    this.setData({ remindEnabled: e.detail.value })
  },

  updateItem(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    const items = [...this.data.planItems]
    items[idx] = { ...items[idx], [field]: val }
    this.setData({ planItems: items }, () => this._calcSummary())
  },

  removeItem(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const items = this.data.planItems.filter((_, i) => i !== idx)
    this.setData({ planItems: items }, () => this._calcSummary())
  },

  goEquipment() {
    const ids = this.data.planItems.map(i => i.equipment_id)
    wx.navigateTo({
      url: '/pages/equipment/equipment?plan_mode=1&existing=' + ids.join(',')
    })
  },

  async saveTemplate() {

    const privacyOk = await requirePrivacyAgree('保存训练模板 /*GUARDED_saveTemplate*/');
    if (!privacyOk) { return; }
      if (this.data.planItems.length === 0) {
      showToast('请先添加器械')
      return
    }
    const tpl = {
      template_id: 'tpl_' + Date.now().toString(36),
      name: this.data.planName || '未命名模板',
      items: this.data.planItems.map(i => ({
        equipment_id: i.equipment_id,
        name: i.name,
        muscle_group: i.muscle_group,
        equipment_type: i.equipment_type,
        weight: i.weight,
        sets: i.sets,
        reps: i.reps,
        duration: i.duration
      })),
      create_time: Date.now()
    }
    localDB.add(localDB.STORES.PLAN_TEMPLATES, tpl)

    const cloud = ensureCloud()
    if (cloud) {
      try {
        tpl.openid = wx.getStorageSync('openid') || ''
        tpl.create_time = cloud.serverDate()
        await cloud.collection('plan_template').add({ data: tpl })
        logger.info(TAG, 'saveTemplate cloud ok')
      } catch (err) {
        logger.warn(TAG, 'saveTemplate cloud fail, local saved', err.message)
      }
    }

      showToast('模板已保存')
      logger.info(TAG, 'saveTemplate id=', tpl.template_id)
      setTimeout(() => wx.redirectTo({ url: '/pages/calendar/calendar' }), 800)
    },

  async savePlan() {

    const privacyOk = await requirePrivacyAgree('保存训练计划 /*GUARDED_savePlan*/');
    if (!privacyOk) { return; }
      if (this.data.planItems.length === 0) {
      showToast('请先添加器械')
      return
    }
    if (!this.data.planName.trim()) {
      showToast('请输入计划名称')
      return
    }

    this.setData({ saving: true })
    showLoading('保存中...')

    const userInfo = localDB.getRaw('userInfo') || {}
    const user_id = userInfo.user_id || ('u_local_' + Date.now().toString(36))
    const cloud = ensureCloud()

    const plan = {
      plan_id: 'fp_' + Date.now().toString(36),
      user_id,
      plan_name: this.data.planName,
      plan_date: this.data.planDate,
      remind_time: this.data.remindEnabled ? this.data.remindTime : null,
      items: this.data.planItems,
      total_sets: this.data.totalSets,
      total_reps: this.data.totalReps,
      estimated_calories: this.data.estimatedCalories,
      status: 0,
      create_time: Date.now()
    }

    try {
      if (cloud) {
        plan.openid = wx.getStorageSync('openid') || ''
        plan.create_time = cloud.serverDate()
        await cloud.collection('fitness_plan').add({ data: plan })
      } else {
        localDB.add(localDB.STORES.FITNESS_PLANS, plan)
      }
      hideLoading()
      this.setData({ saving: false })
      showToast('计划已保存', 'success')
      logger.info(TAG, 'savePlan ok cloud=', !!cloud)

      setTimeout(() => {
        wx.redirectTo({ url: '/pages/calendar/calendar' })
      }, 800)
    } catch (err) {
      hideLoading()
      this.setData({ saving: false })
      logger.error(TAG, 'savePlan fail', err.message)
      try {
        localDB.add(localDB.STORES.FITNESS_PLANS, plan)
        showToast('已保存到本地', 'success')
        setTimeout(() => wx.redirectTo({ url: '/pages/calendar/calendar' }), 800)
      } catch (e2) {
        showToast('保存失败')
      }
    }
  },

  openExercisePicker() {
    this.setData({
      showExercisePicker: true,
      exerciseKeyword: '',
      exerciseFilter: 0
    }, () => this._refreshExerciseList())
  },

  closeExercisePicker() {
    this.setData({ showExercisePicker: false })
  },

  onExerciseKeyword(e) {
    this.setData({ exerciseKeyword: e.detail.value }, () => this._refreshExerciseList())
  },

  onExerciseFilter(e) {
    this.setData({ exerciseFilter: Number(e.currentTarget.dataset.id) }, () => this._refreshExerciseList())
  },

  _refreshExerciseList() {
    const { exerciseKeyword, exerciseFilter } = this.data
    let list = EXERCISE.slice()
    if (exerciseFilter > 0) list = list.filter(e => e.category === exerciseFilter)
    if (exerciseKeyword) {
      const kw = exerciseKeyword.toLowerCase()
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(kw) ||
        (e.muscle_group || '').toLowerCase().includes(kw)
      )
    }
    this.setData({ filteredExercises: list })
  },

  pickExercise(e) {
    const exId = e.currentTarget.dataset.id
    const ex = EXERCISE.find(x => x.exercise_id === exId)
    if (!ex) return

    let eq = EQUIPMENTS.find(q => q.equipment_type === ex.equipment_type)
    if (!eq) {
      showToast('未找到对应器械')
      return
    }

    const item = buildItem(eq, ex)
    const items = [...this.data.planItems, item]
    this.setData({ planItems: items }, () => this._calcSummary())

    showToast(`已添加 ${ex.name}`, 'success')
    this._refreshExerciseList()
  }
})
