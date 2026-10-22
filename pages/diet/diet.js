﻿const localDB = require('../../utils/cloud-storage.js')
const app = getApp()
const logger = require('../../utils/logger.js')
const { today, checkNutritionStatus, calcNutritionPercent, getStatusClass, round, mealTypeMap, showLoading, hideLoading, showToast, showModal, requirePrivacyAgree } = require('../../utils/util.js')
const FOOD_DICT = require('../../data/food')

const TAG = '[page:diet]'
const LOCAL_RECORDS_KEY = 'local_diet_records'
const CUSTOM_FOODS_KEY = 'custom_foods'
const REMOVED_BUILTIN_KEY = 'removed_builtin_foods'

Page({
  data: {
    currentDate: today(),
    weekText: '',
    target: {
      energy: { min: 1200, max: 2000 },
      protein: { min: 60, max: 100 },
      fat: { min: 40, max: 70 },
      carb: { min: 150, max: 250 },
      fiber: { min: 25, max: 30 },
      salt: { min: 0, max: 5 }
    },
    totalIntake: { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0 },
    mealSplit: { breakfast: 0, lunch: 0, dinner: 0 },
    nutritionItems: [],
    energyPercent: 0,
    statusText: {},
    statusClass: {},
    records: [],
    filteredRecords: [],
    mergedRecords: [],
    activeMeal: 0,
    mealTypeMap,

    showManualAdd: false,
    manualMealType: 1,
    manualKeyword: '',
    manualFoodList: [],
    manualWeights: {},

    editMode: false,
    selectedIds: []
  },

  mergeRecords(rawRecords) {
    const groups = new Map()
    rawRecords.forEach(r => {
      const key = (r.food_id || '') + '|' + (Number(r.meal_type) || 0)
      if (!groups.has(key)) {
        groups.set(key, {
          record_id: r.record_id,
          meal_type: Number(r.meal_type) || 0,
          food_id: r.food_id || '',
          food_name: r.food_name || r.name || '',
          weight: 0, energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0,
          count: 0,
          _ids: []
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

  getAllFoods() {
    const removed = new Set(localDB.getAll('removed_builtin_foods'))
    const custom = localDB.getAll('custom_foods')
    const builtin = FOOD_DICT.filter(f => !removed.has(f.food_id))
    return [...builtin, ...custom]
  },

  onShow() {
    const pendingDate = wx.getStorageSync('pending_diet_date')
    if (pendingDate) {
      wx.removeStorageSync('pending_diet_date')
      logger.info(TAG, 'onShow apply pending date=', pendingDate)
      this.setData({ currentDate: pendingDate })
    }
    logger.info(TAG, 'onShow currentDate=', this.data.currentDate, 'cloudReady=', app.globalData.cloudReady)
    Promise.all([
      localDB.syncCustomFoodsFromCloud(),
      localDB.syncUserPrefFromCloud()
    ]).catch(e => logger.warn(TAG, 'onShow cloud food sync fail', e.message))
    this.loadTarget()
    this.calcWeek()
    this.loadRecords()
    if (this.data.showManualAdd) {
      const all = this.getAllFoods()
      const weights = { ...this.data.manualWeights }
      all.forEach(f => { if (!weights[f.food_id]) weights[f.food_id] = f.standard_weight || 100 })
      let filtered = all
      if (this.data.manualKeyword) {
        filtered = all.filter(f => (f.name || '').toLowerCase().includes(this.data.manualKeyword))
      }
      this.setData({ _manualAllFoods: all, manualFoodList: this.renderManualList(filtered, weights), manualWeights: weights })
    }
  },

  calcWeek() {
    const d = new Date(this.data.currentDate)
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    this.setData({ weekText: weeks[d.getDay()] })
  },

  loadTarget() {
    const storageTarget = localDB.getRaw('nutritionTarget')
    if (storageTarget) {
      logger.info(TAG, 'loadTarget ok version=', storageTarget.version)
      const target = { ...this.data.target, ...storageTarget }
      this.setData({ target })
    } else {
      logger.warn(TAG, 'loadTarget no_storage_use_default')
    }
  },

  getLocalRecords() {
    const all = localDB.getAll('local_diet_records')
    const date = this.data.currentDate
    return all.filter(r => (r.record_date || r.recordDate) === date)
  },

  saveLocalRecord(record) {
    const all = localDB.getAll('local_diet_records')
    record.recordDate = this.data.currentDate
    all.push(record)
    localDB.setAll('local_diet_records', all)
    logger.info(TAG, 'saveLocalRecord ok total=', all.length)
  },

  removeLocalRecord(id) {
    const all = localDB.getAll('local_diet_records')
    const filtered = all.filter(r => r.record_id !== id)
    localDB.setAll('local_diet_records', filtered)
    logger.info(TAG, 'removeLocalRecord ok remain=', filtered.length)
  },

  removeLocalRecords(ids) {
    const set = new Set(ids)
    const all = localDB.getAll('local_diet_records')
    const filtered = all.filter(r => !set.has(r.record_id))
    localDB.setAll('local_diet_records', filtered)
    logger.info(TAG, 'removeLocalRecords ok ids=', ids.length, 'remain=', filtered.length)
  },

  async loadRecords() {
    const openid = wx.getStorageSync('openid')
    if (!openid) { logger.warn(TAG, 'loadRecords no_openid'); return }

    showLoading()
    try {
      let cloudRecords = []
      let localRecords = this.getLocalRecords()
      if (app.globalData.cloudReady && !app.globalData.isGuest) {
        try {
          logger.info(TAG, 'loadRecords cloud_query openid=', openid)
          const db = wx.cloud.database()
          const userRes = await db.collection('user_info').where({ openid }).get()
          const user_id = userRes.data[0]?.user_id
          if (user_id) {
            const date = new Date(this.data.currentDate)
            const res = await db.collection('diet_record')
              .where({ user_id, record_date: db.command.eq(date) })
              .orderBy('create_time', 'asc').get()
            cloudRecords = res.data || []
          }
        } catch (cloudErr) {
          logger.warn(TAG, 'loadRecords cloud fail, use local', cloudErr.message)
        }
      }
      const mergedMap = new Map()
      ;[...cloudRecords, ...localRecords].forEach(r => {
        const k = r.record_id || r._id || JSON.stringify(r)
        if (!mergedMap.has(k)) mergedMap.set(k, r)
      })
      const records = Array.from(mergedMap.values()).map(r => this.normalizeRecord(r))
      logger.info(TAG, 'loadRecords cloud=', cloudRecords.length, 'local=', localRecords.length, 'merged=', records.length)
      const merged = this.mergeRecords(records)
      this.calcIntake(records)
      this.setData({ records, mergedRecords: merged }, () => this.filterRecords())
      hideLoading()
    } catch (err) {
      logger.error(TAG, 'loadRecords error', err.name, err.message)
      hideLoading()
      try {
        const local = this.getLocalRecords().map(r => this.normalizeRecord(r))
        this.calcIntake(local)
        this.setData({ records: local, mergedRecords: this.mergeRecords(local) }, () => this.filterRecords())
      } catch (e) { this.calcIntake([]); this.setData({ records: [], mergedRecords: [] }, () => this.filterRecords()) }
    }
  },

  normalizeRecord(r) {
    const rid = r.record_id || r._id || r.recordId || ''
    return {
      ...r,
      record_id: rid,
      meal_type: Number(r.meal_type) || Number(r.mealType) || 0,
      food_name: r.food_name || r.foodName || r.name || '',
      record_date: r.record_date || r.recordDate || '',
      weight: Math.round(Number(r.weight != null ? r.weight : (r.weight_g != null ? r.weight_g : 0))),
      energy: Math.round(Number(r.energy != null ? r.energy : (r.energy_kcal != null ? r.energy_kcal : 0))),
      protein: round(Number(r.protein != null ? r.protein : (r.protein_g != null ? r.protein_g : 0))),
      fat: round(Number(r.fat != null ? r.fat : (r.fat_g != null ? r.fat_g : 0))),
      carb: round(Number(r.carb != null ? r.carb : (r.carb_g != null ? r.carb_g : 0))),
      fiber: round(Number(r.fiber != null ? r.fiber : (r.fiber_g != null ? r.fiber_g : 0))),
      salt: round(Number(r.salt != null ? r.salt : (r.salt_g != null ? r.salt_g : 0)), 2)
    }
  },

  calcIntake(records) {
    const target = this.data.target
    const total = { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0 }
    const split = { breakfast: 0, lunch: 0, dinner: 0 }
    records.forEach(r => {
      const mealType = Number(r.meal_type) || 0
      const energy = Number(r.energy) || 0
      total.energy += energy; total.protein += Number(r.protein) || 0
      total.fat += Number(r.fat) || 0; total.carb += Number(r.carb) || 0
      total.fiber += Number(r.fiber) || 0; total.salt += Number(r.salt) || 0
      if (mealType === 1) split.breakfast += Math.round(energy)
      else if (mealType === 2) split.lunch += Math.round(energy)
      else if (mealType === 3) split.dinner += Math.round(energy)
    })
    const keys = ['energy', 'protein', 'fat', 'carb', 'fiber', 'salt']
    const labels = { energy: '能量(kcal)', protein: '蛋白质(g)', fat: '脂肪(g)', carb: '碳水(g)', fiber: '膳食纤维(g)', salt: '盐(g)' }
    const units = { energy: '', protein: 'g', fat: 'g', carb: 'g', fiber: 'g', salt: 'g' }
    const nutritionItems = [], statusText = {}, statusClass = {}
    keys.forEach(key => {
      const t = target[key] || { min: 0, max: 0 }
      const status = checkNutritionStatus(total[key], t.min, t.max)
      const percent = Math.min(calcNutritionPercent(total[key], t.min, t.max), 100)
      nutritionItems.push({
        key, label: labels[key], current: round(total[key]),
        min: t.min, max: t.max, unit: units[key], status,
        percent: key === 'energy' ? (percent / 100) * 360 : percent,
        statusClass: getStatusClass(status)
      })
      statusText[key] = status; statusClass[key] = getStatusClass(status)
    })
    const energyPercent = Math.min((total.energy / (target.energy.max || 2000)) * 360, 360)
    this.setData({
      totalIntake: { energy: round(total.energy), protein: round(total.protein), fat: round(total.fat), carb: round(total.carb), fiber: round(total.fiber), salt: round(total.salt, 2) },
      mealSplit: split, nutritionItems, energyPercent, statusText, statusClass, records
    })
  },

  filterRecords() {
    const { mergedRecords, activeMeal, selectedIds } = this.data
    const src = activeMeal === 0 ? mergedRecords : mergedRecords.filter(r => r.meal_type === activeMeal)
    const withSel = src.map(r => ({ ...r, _selected: selectedIds.includes(r.record_id) }))
    this.setData({ filteredRecords: withSel })
  },

  switchMeal(e) { this.setData({ activeMeal: Number(e.currentTarget.dataset.meal) }, () => this.filterRecords()) },

  onDateChange(e) {
    const date = e.detail.value
    logger.info(TAG, 'onDateChange date=', date)
    this.setData({ currentDate: date }, () => { this.calcWeek(); this.loadRecords() })
  },

  prevDay() {
    const d = new Date(this.data.currentDate); d.setDate(d.getDate() - 1)
    const date = today(d); logger.info(TAG, 'prevDay date=', date)
    this.setData({ currentDate: date }, () => { this.calcWeek(); this.loadRecords() })
  },

  nextDay() {
    const d = new Date(this.data.currentDate); d.setDate(d.getDate() + 1)
    const date = today(d); logger.info(TAG, 'nextDay date=', date)
    this.setData({ currentDate: date }, () => { this.calcWeek(); this.loadRecords() })
  },

  async deleteRecord(e) {
    const privacyOk = await requirePrivacyAgree('删除记录需要您先阅读并同意协议。');
    if (!privacyOk) { return; }
    const id = e.currentTarget.dataset.id
    const ids = e.currentTarget.dataset.ids
    const targetIds = (ids && ids.length) ? ids : [id]
    logger.info(TAG, 'deleteRecord ids=', targetIds)
    const msg = ids && ids.length > 1
      ? `这条 ${ids.length} 条合并记录，确定全部删除吗？`
      : '确定删除这条记录吗？'
    const confirm = await showModal('提示', msg)
    if (!confirm) { logger.info(TAG, 'deleteRecord cancel'); return }
    try {
      if (app.globalData.cloudReady && !app.globalData.isGuest) {
        try {
          const db = wx.cloud.database()
          for (const rid of targetIds) {
            try { await db.collection('diet_record').where({ record_id: rid }).remove() } catch (cloudErr) {}
            try { await db.collection('diet_record').where({ _id: rid }).remove() } catch (cloudErr) {}
          }
          logger.info(TAG, 'deleteRecord cloud attempted')
        } catch (cloudErr) {
          logger.warn(TAG, 'deleteRecord cloud fail, will still remove local', cloudErr.message)
        }
      }
      this.removeLocalRecords(targetIds)
      showToast('已删除', 'success')
      logger.info(TAG, 'deleteRecord ok ids=', targetIds)
      this.loadRecords()
    } catch (err) {
      logger.error(TAG, 'deleteRecord error ids=', targetIds, err.message)
      try { this.removeLocalRecords(targetIds) } catch (e) {}
      showToast('已删除')
      this.loadRecords()
    }
  },

  goWheel() { logger.info(TAG, 'goWheel'); wx.navigateTo({ url: '/pages/diet-wheel/diet-wheel' }) },

  goDietCalendar() { logger.info(TAG, 'goDietCalendar'); wx.navigateTo({ url: '/pages/diet-calendar/diet-calendar' }) },

  manualAdd() {
    logger.info(TAG, 'manualAdd open')
    const all = this.getAllFoods()
    const weights = {}
    all.forEach(f => { weights[f.food_id] = f.standard_weight || 100 })
    const list = this.renderManualList(all, weights)
    this.setData({
      showManualAdd: true,
      manualKeyword: '',
      manualFoodList: list,
      manualWeights: weights,
      _manualAllFoods: all
    })
  },

  closeManualAdd() {
    this.setData({ showManualAdd: false, manualKeyword: '', manualWeights: {}, _manualAllFoods: [] })
  },

  renderManualList(all, weights) {
    return all.map(f => {
      const w = Number(weights[f.food_id]) || f.standard_weight || 100
      const r = w / 100
      return {
        ...f,
        _weight: w,
        _energy: Math.round((f.energy_per_100g || 0) * r),
        _protein: ((f.protein_per_100g || 0) * r).toFixed(1),
        _fat: ((f.fat_per_100g || 0) * r).toFixed(1),
        _carb: ((f.carb_per_100g || 0) * r).toFixed(1),
        _fiber: ((f.fiber_per_100g || 0) * r).toFixed(1),
        _salt: ((f.salt_per_100g || 0) * r).toFixed(2)
      }
    })
  },

  onManualWeightInput(e) {
    const fid = e.currentTarget.dataset.id
    const val = e.detail.value
    const weights = { ...this.data.manualWeights, [fid]: val }
    const all = this.data._manualAllFoods || this.getAllFoods()
    const filtered = this.data.manualKeyword
      ? all.filter(f => (f.name || '').toLowerCase().includes(this.data.manualKeyword))
      : all
    this.setData({
      [`manualWeights.${fid}`]: val,
      manualFoodList: this.renderManualList(filtered, weights)
    })
  },

  onManualMealTap(e) {
    const meal = Number(e.currentTarget.dataset.meal)
    logger.info(TAG, 'onManualMealTap meal=', meal)
    this.setData({ manualMealType: meal })
  },

  onManualSearch(e) {
    const kw = (e.detail.value || '').trim().toLowerCase()
    const all = this.data._manualAllFoods || this.getAllFoods()
    let list = all
    if (kw) {
      list = all.filter(f =>
        (f.name || '').toLowerCase().includes(kw)
      )
    }
    const weights = this.data.manualWeights || {}
    this.setData({ manualKeyword: kw, manualFoodList: this.renderManualList(list, weights) })
  },

  noop() {},

  quickAddFood(e) {
    const fid = e.currentTarget.dataset.id
    const food = this.getAllFoods().find(f => f.food_id === fid)
    if (!food) { showToast('食物不存在'); return }
    const weight = Number(this.data.manualWeights[fid]) || food.standard_weight || 100
    logger.info(TAG, 'quickAddFood food=', food.name, 'weight=', weight, 'meal=', this.data.manualMealType)
    this.addDietRecord(food, this.data.manualMealType, weight, 3)
  },

  addFoodCustomWeight(e) {
    const fid = e.currentTarget.dataset.id
    const weightStr = (this.data.manualWeights[fid] || '').trim()
    const food = this.getAllFoods().find(f => f.food_id === fid)
    if (!food) { showToast('食物不存在'); return }
    const weight = Number(weightStr) || food.standard_weight || 100
    if (weight < 1 || weight > 2000) { showToast('请输入1-2000g'); return }
    logger.info(TAG, 'addFoodCustomWeight food=', food.name, 'weight=', weight, 'meal=', this.data.manualMealType)
    this.addDietRecord(food, this.data.manualMealType, weight, 3)
  },

  toggleEditMode() {
    this.setData({ editMode: !this.data.editMode, selectedIds: [] }, () => this.filterRecords())
  },
  toggleSelectItem(e) {
    const id = e.currentTarget.dataset.id
    let list = this.data.selectedIds.slice()
    const idx = list.indexOf(id)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    this.setData({ selectedIds: list }, () => this.filterRecords())
  },
  selectAllRecords() {
    const { filteredRecords, selectedIds } = this.data
    const ids = filteredRecords.map(r => r.record_id)
    const isAll = ids.length > 0 && ids.every(i => selectedIds.includes(i))
    this.setData({ selectedIds: isAll ? [] : ids }, () => this.filterRecords())
  },
  async batchDelete() {
    const privacyOk = await requirePrivacyAgree('删除记录需要您先阅读并同意协议。');
    if (!privacyOk) { return; }
    if (!this.data.selectedIds.length) { showToast('请先选择记录'); return }
    const confirm = await showModal('提示', `确定删除选中的 ${this.data.selectedIds.length} 条记录吗？`)
    if (!confirm) return
    try {
      const mainIds = this.data.selectedIds
      const allIds = []
      this.data.filteredRecords.forEach(r => {
        if (mainIds.includes(r.record_id)) {
          (r._ids && r._ids.length ? r._ids : [r.record_id]).forEach(i => allIds.push(i))
        }
      })
      const unique = [...new Set(allIds)]
      if (app.globalData.cloudReady && !app.globalData.isGuest) {
        try {
          const db = wx.cloud.database()
          for (const rid of unique) {
            try { await db.collection('diet_record').where({ record_id: rid }).remove() } catch (e) {}
            try { await db.collection('diet_record').where({ _id: rid }).remove() } catch (e) {}
          }
        } catch (e) {}
      }
      this.removeLocalRecords(unique)
      showToast('已批量删除', 'success')
      this.setData({ editMode: false, selectedIds: [] })
      this.loadRecords()
    } catch (err) {
      logger.error(TAG, 'batchDelete error', err.message)
      showToast('删除失败')
    }
  },

  openCustomFromManual() {
    wx.navigateTo({ url: '/pages/diet-wheel/diet-wheel?openCustom=1' })
  },

  async addDietRecord(food, mealType, weight, sourceType) {
    const privacyOk = await requirePrivacyAgree('添加记录需要您先阅读并同意协议。');
    if (!privacyOk) { logger.info(TAG, 'addDietRecord privacy_not_agreed'); return; }
    showLoading('添加中...')
    const openid = wx.getStorageSync('openid')
    const user_id = localDB.getRaw('userInfo')?.user_id || ('u_local_' + Date.now().toString(36))
    logger.info(TAG, 'addDietRecord start food=', food.name, 'weight=', weight, 'mealType=', mealType, 'cloud=', app.globalData.cloudReady)
    const ratio = weight / 100
    const localRecord = {
      record_id: 'rec_' + Date.now().toString(36),
      user_id, meal_type: mealType,
      food_id: food.food_id || '', food_name: food.name, weight,
      energy: round(food.energy_per_100g * ratio),
      protein: round(food.protein_per_100g * ratio),
      fat: round(food.fat_per_100g * ratio),
      carb: round(food.carb_per_100g * ratio),
      fiber: round(food.fiber_per_100g * ratio),
      salt: round(food.salt_per_100g * ratio, 2),
      source_type: sourceType, create_time: Date.now(),
      record_date: this.data.currentDate, recordDate: this.data.currentDate
    }
    try {
      if (app.globalData.cloudReady && !app.globalData.isGuest) {
        try {
          const db = wx.cloud.database()
          const cloudRecord = { ...localRecord }
          cloudRecord.record_date = new Date(this.data.currentDate)
          cloudRecord.create_time = db.serverDate()
          logger.info(TAG, 'addDietRecord db_add food=', food.name)
          await db.collection('diet_record').add({ data: cloudRecord })
          logger.info(TAG, 'addDietRecord cloud ok food=', food.name)
        } catch (cloudErr) {
          logger.warn(TAG, 'addDietRecord cloud fail, will still save local', cloudErr.message)
        }
      }
      this.saveLocalRecord(localRecord)
      hideLoading(); showToast('添加成功', 'success')
      logger.info(TAG, 'addDietRecord ok food=', food.name)
      this.closeManualAdd()
      this.loadRecords()
    } catch (err) {
      hideLoading()
      logger.error(TAG, 'addDietRecord error food=', food.name, err.name, err.message)
      try { this.saveLocalRecord(localRecord) } catch (e) {}
      showToast('添加成功')
      this.closeManualAdd()
      this.loadRecords()
    }
  }
})

