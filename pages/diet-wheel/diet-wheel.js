const app = getApp()
const logger = require('../../utils/logger.js')
const { showToast, round, showModal } = require('../../utils/util.js')
const localDB = require('../../utils/cloud-storage.js')
const FOODS = require('../../data/food')

const TAG = '[page:diet-wheel]'
const CUSTOM_FOODS_KEY = 'custom_foods'
const REMOVED_BUILTIN_KEY = 'removed_builtin_foods'
const SECTOR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

Page({
  data: {
    activeMeal: 1,
    pools: { 1: [], 2: [], 3: [] },
    currentPool: [],
    rotation: 0,
    spinning: false,
    selectedResult: null,
    spinHistory: [],
    wheelBg: '',
    adding: false,
    showAddModal: false,
    showCustomModal: false,
    addKeyword: '',
    addList: [],
    customName: '',
    customEnergy: '',
    customProtein: '',
    customFat: '',
    customCarb: '',
    customFiber: '',
    customSalt: '',
    customWeight: '',
    poolEditMode: false,
    poolEditSelected: [],
    poolIsAllSelected: false,
    poolChipSelectedMap: {},

    addModalManageMode: false,
    addModalSelected: [],
    addModalIsAllSelected: false
  },

  updateCurrentPool() {
    const pool = this.data.pools[this.data.activeMeal] || []
    const bg = this.buildWheelBg(pool)
    this.setData({ currentPool: pool, wheelBg: bg })
    this.refreshPoolEditFlags()
  },

  refreshPoolEditFlags() {
    const pool = this.data.pools[this.data.activeMeal] || []
    const selected = this.data.poolEditSelected
    const set = new Set(selected)
    const map = {}
    pool.forEach(f => { map[f.food_id] = set.has(f.food_id) })
    const isAll = pool.length > 0 && pool.every(f => set.has(f.food_id))
    this.setData({ poolChipSelectedMap: map, poolIsAllSelected: isAll })
  },

  buildWheelBg(pool) {
    if (!pool || pool.length === 0) return '#F3F4F6'
    const n = pool.length
    const step = 360 / n
    let parts = []
    for (let i = 0; i < n; i++) {
      const color = SECTOR_COLORS[i % SECTOR_COLORS.length]
      parts.push(`${color} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`)
    }
    return `conic-gradient(from 0deg, ${parts.join(', ')})`
  },

  getAllFoods() {
    const removed = new Set(wx.getStorageSync(REMOVED_BUILTIN_KEY) || [])
    const custom = wx.getStorageSync(CUSTOM_FOODS_KEY) || []
    const builtin = FOODS.filter(f => !removed.has(f.food_id))
    return [...builtin, ...custom]
  },

  onLoad() {
    logger.info(TAG, 'onLoad')
    this.initDefaultPools()
  },

  initDefaultPools() {
    const all = this.getAllFoods()
    const mealDefaults = {
      1: ['燕麦片', '牛奶', '全麦面包', '鸡蛋', '香蕉', '无糖酸奶'],
      2: ['鸡胸肉', '白米饭', '西兰花', '牛肉', '虾仁', '菠菜'],
      3: ['三文鱼', '糙米饭', '牛油果', '豆腐', '鸡腿肉', '橙子']
    }
    const pools = { 1: [], 2: [], 3: [] }
    Object.keys(mealDefaults).forEach(meal => {
      pools[meal] = mealDefaults[meal]
        .map(n => all.find(f => f.name === n))
        .filter(Boolean)
    })
    logger.info(TAG, 'initDefaultPools sizes=', pools[1].length, pools[2].length, pools[3].length)
    this.setData({ pools }, () => this.updateCurrentPool())
  },

  switchMeal(e) {
    if (this.data.spinning) return
    const m = Number(e.currentTarget.dataset.meal)
    this.setData({ activeMeal: m, selectedResult: null, rotation: 0 }, () => this.updateCurrentPool())
  },

  startSpin() {
    const pool = this.data.pools[this.data.activeMeal]
    if (!pool || pool.length < 2) {
      showToast('请先添加至少2种食物到池子里')
      return
    }
    if (this.data.spinning) return
    logger.info(TAG, 'startSpin poolSize=', pool.length)

    const targetIndex = Math.floor(Math.random() * pool.length)
    const sectorAngle = 360 / pool.length
    const extraRotations = 5
    const currentRotation = this.data.rotation % 360
    const targetAngle = 360 - (targetIndex * sectorAngle + sectorAngle / 2)
    const finalRotation = this.data.rotation - currentRotation + targetAngle + extraRotations * 360

    this.setData({ spinning: true, rotation: finalRotation, selectedResult: null })
    setTimeout(() => {
      const result = pool[targetIndex]
      this.setData({ spinning: false, selectedResult: result })
      const newHistory = [...this.data.spinHistory, result]
      this.setData({ spinHistory: newHistory })
      logger.info(TAG, 'spin result=', result.name)
    }, 4200)
  },

  _decorateAddList(list, selectedArr) {
    const set = new Set(selectedArr)
    return list.map(f => ({ ...f, _isCustom: !!f.isCustom, _selected: set.has(f.food_id) }))
  },

  showAddFood() {
    const list = this.getAllFoods()
    this.setData({
      showAddModal: true, addKeyword: '',
      addList: this._decorateAddList(list, []),
      addModalManageMode: false, addModalSelected: [], addModalIsAllSelected: false
    })
  },

  onAddKeyword(e) {
    const kw = (e.detail.value || '').trim().toLowerCase()
    let list = this.getAllFoods()
    if (kw) list = list.filter(f => (f.name || '').toLowerCase().includes(kw))
    const sel = this.data.addModalSelected
    const set = new Set(sel)
    const isAll = list.length > 0 && list.every(f => set.has(f.food_id))
    this.setData({
      addKeyword: kw,
      addList: this._decorateAddList(list, sel),
      addModalIsAllSelected: isAll
    })
  },

  closeAddModal() {
    this.setData({
      showAddModal: false, addKeyword: '',
      addList: [],
      addModalManageMode: false, addModalSelected: [], addModalIsAllSelected: false
    })
  },

  openCustomModal() {
    logger.info(TAG, 'openCustomModal')
    this.setData({
      showAddModal: false,
      showCustomModal: true,
      customName: '',
      customEnergy: '',
      customProtein: '',
      customFat: '',
      customCarb: '',
      customFiber: '',
      customSalt: '',
      customWeight: '100'
    })
  },

  closeCustomModal() {
    this.setData({ showCustomModal: false })
  },

  onCustomInput(e) {
    const field = e.currentTarget.dataset.field
    const map = {
      name: 'customName', energy: 'customEnergy',
      protein: 'customProtein', fat: 'customFat',
      carb: 'customCarb', fiber: 'customFiber',
      salt: 'customSalt', weight: 'customWeight'
    }
    const key = map[field] || ('custom' + field.charAt(0).toUpperCase() + field.slice(1))
    this.setData({ [key]: e.detail.value })
  },

  noop() {},

  saveCustomFood() {
    try {
      const { customName, customEnergy, customProtein, customFat, customCarb, customFiber, customSalt, customWeight, activeMeal } = this.data
      const name = (customName || '').trim()
      logger.info(TAG, 'saveCustomFood input name=', name, 'energy=', customEnergy, 'protein=', customProtein, 'weight=', customWeight, 'meal=', activeMeal)

      if (!name) { showToast('请输入食物名称'); return }
      const energy = Number(customEnergy) || 0
      const protein = Number(customProtein) || 0
      const fat = Number(customFat) || 0
      const carb = Number(customCarb) || 0
      const fiber = Number(customFiber) || 0
      const salt = Number(customSalt) || 0
      const weight = Number(customWeight) || 100

      let custom = []
      try {
        const raw = wx.getStorageSync(CUSTOM_FOODS_KEY)
        if (Array.isArray(raw)) custom = raw
      } catch (e) {
        logger.warn(TAG, 'saveCustomFood read storage fallback', e.message)
      }

      const newFood = {
        food_id: 'cus_' + Date.now(),
        name: name,
        standard_weight: weight,
        energy_per_100g: energy,
        protein_per_100g: protein,
        fat_per_100g: fat,
        carb_per_100g: carb,
        fiber_per_100g: fiber,
        salt_per_100g: salt,
        applicable_meal: 4,
        isCustom: true
      }
      custom.push(newFood)
      wx.setStorageSync(CUSTOM_FOODS_KEY, custom)
      logger.info(TAG, 'saveCustomFood saved storage ok count=', custom.length)

      const pools = JSON.parse(JSON.stringify(this.data.pools || { 1: [], 2: [], 3: [] }))
      if (!pools[activeMeal] || !Array.isArray(pools[activeMeal])) pools[activeMeal] = []
      const mealArr = pools[activeMeal]
      const exists = mealArr.some(f => f && f.food_id === newFood.food_id)
      if (!exists) mealArr.push(newFood)

      this.setData({
        pools,
        showCustomModal: false, showAddModal: false,
        selectedResult: null, rotation: 0,
        customName: '', customEnergy: '', customProtein: '',
        customFat: '', customCarb: '', customFiber: '', customSalt: '',
        customWeight: '100'
      }, () => {
        this.updateCurrentPool()
        wx.showToast({ title: '已添加并加入转盘', icon: 'success', duration: 2000 })
        logger.info(TAG, 'saveCustomFood all done, pool size=', mealArr.length)
      })
    } catch (err) {
      logger.error(TAG, 'saveCustomFood FATAL', err && err.message, err && err.stack)
      wx.showToast({ title: '保存失败，请重试', icon: 'none', duration: 2500 })
    }
  },

  confirmAddToPool(e) {
    const fid = e.currentTarget.dataset.id
    const food = this.getAllFoods().find(f => f.food_id === fid)
    if (!food) return
    const meal = this.data.activeMeal
    const pools = JSON.parse(JSON.stringify(this.data.pools))
    if (pools[meal].find(f => f.food_id === fid)) {
      showToast('已在池子里')
      return
    }
    pools[meal].push(food)
    logger.info(TAG, 'confirmAddToPool meal=', meal, 'food=', food.name)
    this.setData({ pools, showAddModal: false }, () => {
      this.updateCurrentPool()
      wx.showToast({ title: '已加入池子', icon: 'success', duration: 2000 })
    })
  },

  removeFromPool(e) {
    const fid = e.currentTarget.dataset.id
    const pools = JSON.parse(JSON.stringify(this.data.pools))
    pools[this.data.activeMeal] = pools[this.data.activeMeal].filter(f => f.food_id !== fid)
    logger.info(TAG, 'removeFromPool food=', fid)
    this.setData({ pools }, () => this.updateCurrentPool())
  },

  togglePoolEdit() {
    if (!this.data.poolEditMode) {
      this.setData({ poolEditMode: true, poolEditSelected: [] }, () => this.refreshPoolEditFlags())
    } else {
      this.setData({ poolEditMode: false, poolEditSelected: [], poolIsAllSelected: false, poolChipSelectedMap: {} })
    }
  },

  togglePoolSelect(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.poolEditSelected.slice()
    const idx = list.indexOf(id)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    this.setData({ poolEditSelected: list }, () => this.refreshPoolEditFlags())
  },

  poolSelectAll() {
    const pool = this.data.pools[this.data.activeMeal] || []
    const ids = pool.map(f => f.food_id)
    const isAll = this.data.poolIsAllSelected
    this.setData({ poolEditSelected: isAll ? [] : ids }, () => this.refreshPoolEditFlags())
  },

  async batchRemoveFromPool() {
    if (!this.data.poolEditSelected.length) { showToast('请先选择'); return }
    const confirm = await showModal('提示', `确定从转盘移除选中的 ${this.data.poolEditSelected.length} 种食物吗？`)
    if (!confirm) return
    try {
      const set = new Set(this.data.poolEditSelected)
      const pools = JSON.parse(JSON.stringify(this.data.pools))
      pools[this.data.activeMeal] = (pools[this.data.activeMeal] || []).filter(f => !set.has(f.food_id))
      this.setData({ pools, poolEditMode: false, poolEditSelected: [] }, () => this.updateCurrentPool())
      showToast('已移除', 'success')
    } catch (err) {
      logger.error(TAG, 'batchRemoveFromPool error', err.message)
      showToast('操作失败')
    }
  },

  toggleAddModalManage() {
    if (!this.data.addModalManageMode) {
      this.setData({
        addModalManageMode: true,
        addModalSelected: [],
        addModalIsAllSelected: false,
        addList: this._decorateAddList(this.data.addList, [])
      })
    } else {
      this.setData({
        addModalManageMode: false,
        addModalSelected: [],
        addModalIsAllSelected: false,
        addList: this._decorateAddList(this.data.addList, [])
      })
    }
  },

  toggleAddModalSelect(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.addModalSelected.slice()
    const idx = list.indexOf(id)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(id)
    const isAll = this.data.addList.length > 0 && list.length === this.data.addList.length
    this.setData({
      addModalSelected: list,
      addModalIsAllSelected: isAll,
      addList: this._decorateAddList(this.data.addList, list)
    })
  },

  addModalSelectAll() {
    const ids = this.data.addList.map(f => f.food_id)
    const isAll = this.data.addModalIsAllSelected
    const selected = isAll ? [] : ids
    this.setData({
      addModalSelected: selected,
      addModalIsAllSelected: !isAll,
      addList: this._decorateAddList(this.data.addList, selected)
    })
  },

  async batchDeleteFoodDict() {
    const sel = this.data.addModalSelected
    if (!sel.length) { showToast('请先选择要删除的食物'); return }
    const confirm = await showModal('提示', `确定从食物库中删除选中的 ${sel.length} 种食物吗？删除后不会再出现在转盘或手动添加里。`)
    if (!confirm) return
    try {
      const set = new Set(sel)
      const currentList = this.data.addList
      const toRemoveBuiltin = currentList.filter(f => !f.isCustom && set.has(f.food_id)).map(f => f.food_id)
      const toRemoveCustom = currentList.filter(f => f.isCustom && set.has(f.food_id)).map(f => f.food_id)

      if (toRemoveBuiltin.length) {
        const existing = wx.getStorageSync(REMOVED_BUILTIN_KEY) || []
        wx.setStorageSync(REMOVED_BUILTIN_KEY, [...new Set([...existing, ...toRemoveBuiltin])])
      }
      if (toRemoveCustom.length) {
        const existing = wx.getStorageSync(CUSTOM_FOODS_KEY) || []
        const remain = existing.filter(f => !set.has(f.food_id))
        wx.setStorageSync(CUSTOM_FOODS_KEY, remain)
      }

      const all = this.getAllFoods()
      const kw = this.data.addKeyword
      const filtered = kw ? all.filter(f => (f.name || '').toLowerCase().includes(kw)) : all

      const pools = JSON.parse(JSON.stringify(this.data.pools))
      Object.keys(pools).forEach(k => {
        pools[k] = (pools[k] || []).filter(f => !set.has(f.food_id))
      })

      this.setData({
        pools,
        addList: this._decorateAddList(filtered, []),
        addModalSelected: [],
        addModalIsAllSelected: false
      }, () => this.updateCurrentPool())

      showToast(`已删除 ${sel.length} 种`, 'success')
    } catch (err) {
      logger.error(TAG, 'batchDeleteFoodDict error', err.message)
      showToast('删除失败')
    }
  },

  clearHistory() {
    this.setData({ spinHistory: [], selectedResult: null })
  },

  confirmAdd() {
    const history = this.data.spinHistory
    if (!history || history.length === 0) { showToast('还没选食物'); return }
    const meal = this.data.activeMeal
    this.setData({ adding: true })
    try {
      history.forEach(food => {
        const rec = this.buildRecord(food, meal)
        localDB.add(localDB.STORES.DIET_RECORDS, rec)
      })
      logger.info(TAG, 'confirmAdd count=', history.length, 'meal=', meal)
      showToast('已添加 ' + history.length + ' 条记录')
      this.setData({ spinHistory: [], selectedResult: null })
    } catch (err) {
      logger.error(TAG, 'confirmAdd error', err.message)
      showToast('保存失败')
    } finally {
      this.setData({ adding: false })
    }
  },

  buildRecord(food, meal) {
    const weight = food.standard_weight || 100
    const factor = weight / 100
    return {
      record_id: 'dr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      record_date: new Date().toISOString().slice(0, 10),
      meal_type: meal,
      food_id: food.food_id,
      food_name: food.name,
      weight: Math.round(weight),
      energy: Math.round(food.energy_per_100g * factor),
      protein: round(food.protein_per_100g * factor, 1),
      fat: round(food.fat_per_100g * factor, 1),
      carb: round(food.carb_per_100g * factor, 1),
      fiber: round((food.fiber_per_100g || 0) * factor, 1),
      salt: round((food.salt_per_100g || 0) * factor, 2),
      source: 'wheel'
    }
  }
})
