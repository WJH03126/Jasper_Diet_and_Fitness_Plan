const app = getApp()
const logger = require('../../utils/logger.js')
const { showToast } = require('../../utils/util.js')

const TAG = '[page:equipment]'
const EQUIPMENT = require('../../data/equipment')
const EXERCISE = require('../../data/exercise')

Page({
  data: {
    keyword: '',
    activePart: 0,
    activeType: 0,
    planMode: false,
    existingIds: [],
    partList: [
      { id: 0, name: '全部' },
      { id: 1, name: '胸部' },
      { id: 2, name: '背部' },
      { id: 3, name: '肩部' },
      { id: 4, name: '手臂' },
      { id: 5, name: '腿部' },
      { id: 6, name: '核心' },
      { id: 7, name: '热身' }
    ],
    equipments: [],
    filteredEquipments: [],
    selectedEquipments: [],
    showDetail: false,
    currentEquipment: null,
    showExerciseModal: false,
    selectedForExercise: null,
    filteredExercises: []
  },

  onLoad(options) {
    logger.info(TAG, 'onLoad options=', options)
    const list = EQUIPMENT || []
    const planMode = options && options.plan_mode === '1'
    const existingIds = planMode && options.existing ? options.existing.split(',').filter(Boolean) : []

    const { marked, allSel } = this._markSelected(list, existingIds)
    this.setData({
      equipments: marked,
      filteredEquipments: marked,
      _allCurrentSelected: allSel,
      planMode,
      existingIds,
      selectedEquipments: existingIds
    })
  },

  onUnload() {
    if (this.data.planMode) {
      wx.setStorageSync('eq_to_add', this.data.selectedEquipments)
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
    this.applyFilter()
  },

  selectPart(e) {
    const id = Number(e.currentTarget.dataset.id)
    logger.info(TAG, 'selectPart id=', id)
    this.setData({ activePart: id })
    this.applyFilter()
  },

  selectType(e) {
    const t = Number(e.currentTarget.dataset.type)
    logger.info(TAG, 'selectType type=', t)
    this.setData({ activeType: t })
    this.applyFilter()
  },

  applyFilter() {
    const { equipments, keyword, activePart, activeType, selectedEquipments } = this.data
    let list = equipments.slice()

    if (activePart > 0) {
      list = list.filter(e => e.primary_part === activePart)
    }
    if (activeType > 0) {
      list = list.filter(e => e.equipment_type === activeType)
    }
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      list = list.filter(e =>
        (e.name || '').toLowerCase().includes(kw) ||
        (e.muscle_group || '').toLowerCase().includes(kw)
      )
    }

    const { marked, allSel } = this._markSelected(list, selectedEquipments)
    this.setData({ filteredEquipments: marked, _allCurrentSelected: allSel })
    logger.info(TAG, 'applyFilter result=', list.length)
  },

  _markSelected(list, selectedIds) {
    const set = new Set(selectedIds)
    const marked = list.map(item => ({ ...item, _selected: set.has(item.equipment_id) }))
    const allSel = marked.length > 0 && marked.every(i => i._selected)
    return { marked, allSel }
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    const eq = this.data.equipments.find(x => x.equipment_id === id)
    if (!eq) return
    logger.info(TAG, 'viewDetail id=', id)
    this.setData({ currentEquipment: eq, showDetail: true })
  },

  closeDetail() {
    this.setData({ showDetail: false, currentEquipment: null })
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const selected = this.data.selectedEquipments.slice()
    const idx = selected.indexOf(id)
    if (idx >= 0) {
      selected.splice(idx, 1)
    } else {
      selected.push(id)
    }
    const { marked, allSel } = this._markSelected(this.data.filteredEquipments, selected)
    this.setData({
      selectedEquipments: selected,
      filteredEquipments: marked,
      _allCurrentSelected: allSel
    })
    logger.info(TAG, 'toggleSelect id=', id, 'selected=', selected.length)
  },

  toggleSelectAll() {
    const { filteredEquipments, selectedEquipments } = this.data
    if (filteredEquipments.length === 0) return

    const selSet = new Set(selectedEquipments)
    const allAlreadySel = filteredEquipments.every(i => selSet.has(i.equipment_id))

    if (allAlreadySel) {
      const filteredSet = new Set(filteredEquipments.map(i => i.equipment_id))
      const remaining = selectedEquipments.filter(id => !filteredSet.has(id))
      const { marked, allSel } = this._markSelected(filteredEquipments, remaining)
      this.setData({ selectedEquipments: remaining, filteredEquipments: marked, _allCurrentSelected: allSel })
    } else {
      const merged = new Set(selectedEquipments)
      filteredEquipments.forEach(i => merged.add(i.equipment_id))
      const arr = [...merged]
      const { marked, allSel } = this._markSelected(filteredEquipments, arr)
      this.setData({ selectedEquipments: arr, filteredEquipments: marked, _allCurrentSelected: allSel })
    }
  },

  clearAllSelect() {
    const { marked, allSel } = this._markSelected(this.data.filteredEquipments, [])
    this.setData({ selectedEquipments: [], filteredEquipments: marked, _allCurrentSelected: allSel })
  },

  goCreatePlan() {
    const sel = this.data.selectedEquipments
    if (sel.length === 0) {
      showToast('请先选择器械')
      return
    }
    logger.info(TAG, 'goCreatePlan count=', sel.length, 'planMode=', this.data.planMode)

    if (this.data.planMode) {
      wx.setStorageSync('eq_to_add', sel)
      wx.navigateBack({ delta: 1 })
      return
    }

    wx.navigateTo({
      url: '/pages/plan-create/plan-create?equipment_ids=' + sel.join(',')
    })
  },

  openExercisePicker(e) {
    const id = e.currentTarget.dataset.id
    const eq = this.data.equipments.find(x => x.equipment_id === id)
    if (!eq) return
    logger.info(TAG, 'openExercisePicker eq=', eq.name)

    const list = (EXERCISE || []).filter(ex =>
      ex.equipment_type === eq.equipment_type ||
      ex.category === eq.primary_part
    ).slice(0, 30)

    this.setData({
      showExerciseModal: true,
      selectedForExercise: eq,
      filteredExercises: list
    })
  },

  closeExerciseModal() {
    this.setData({ showExerciseModal: false, selectedForExercise: null })
  }
})
