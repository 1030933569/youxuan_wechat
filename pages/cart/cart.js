const api = require('../../utils/api');
const storage = require('../../utils/storage');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

Page({
  data: {
    cartList: [],
    checkedValues: [],
    isAllChecked: false,
    totalAmount: '0.00',
    selectedCount: 0,
    loading: false
  },

  onShow() {
    this.loadCart();
  },

  updateSummary(cartList) {
    const list = Array.isArray(cartList) ? cartList : [];
    let total = 0;
    let count = 0;
    let isAllChecked = list.length > 0;

    list.forEach((item) => {
      const checked = item.isChecked === 1;
      if (!checked) isAllChecked = false;
      if (!checked) return;
      count += toNumber(item.skuNum);
      total += toNumber(item.cartPrice) * toNumber(item.skuNum);
    });

    const checkedValues = list.filter((it) => it.isChecked === 1).map((it) => String(it.skuId));
    this.setData({
      isAllChecked,
      selectedCount: count,
      totalAmount: total.toFixed(2),
      checkedValues
    });
  },

  async loadCart() {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const list = await api.getCartList();
      const cartList = Array.isArray(list) ? list : [];
      this.setData({ cartList });
      this.updateSummary(cartList);
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  async onSkuNumChange(e) {
    const skuId = e.currentTarget.dataset.skuid;
    const { delta } = e.detail || {};
    if (!skuId || !delta) return;
    try {
      await api.getAddToCart({ skuId, skuNum: delta });
    } catch (err) {
      console.error(err);
    } finally {
      this.loadCart();
    }
  },

  async onDelete(e) {
    const skuId = e.currentTarget.dataset.skuid;
    if (!skuId) return;
    try {
      await api.deleteCart({ skuId });
    } catch (err) {
      console.error(err);
    } finally {
      this.loadCart();
    }
  },

  async onCheckedGroupChange(e) {
    const nextChecked = (e.detail && e.detail.value) || [];
    const prevChecked = this.data.checkedValues || [];
    const prevSet = new Set(prevChecked);
    const nextSet = new Set(nextChecked);

    const changes = [];
    prevSet.forEach((id) => {
      if (!nextSet.has(id)) changes.push({ skuId: id, isChecked: 0 });
    });
    nextSet.forEach((id) => {
      if (!prevSet.has(id)) changes.push({ skuId: id, isChecked: 1 });
    });

    const cartList = (this.data.cartList || []).map((item) => ({
      ...item,
      isChecked: nextSet.has(String(item.skuId)) ? 1 : 0
    }));
    this.setData({ cartList, checkedValues: nextChecked });
    this.updateSummary(cartList);

    if (changes.length === 0) return;
    try {
      await Promise.all(changes.map((c) => api.getCheckCart(c)));
    } catch (err) {
      console.error(err);
    } finally {
      this.loadCart();
    }
  },

  async onAllCheckboxTap() {
    const nextAllChecked = !this.data.isAllChecked;
    const target = nextAllChecked ? 1 : 0;
    const cartList = this.data.cartList || [];

    const nextSet = new Set(nextAllChecked ? cartList.map((it) => String(it.skuId)) : []);
    const optimisticList = cartList.map((item) => ({ ...item, isChecked: target }));
    this.setData({ cartList: optimisticList, checkedValues: Array.from(nextSet) });
    this.updateSummary(optimisticList);

    try {
      const tasks = cartList
        .filter((it) => it.isChecked !== target)
        .map((it) => api.getCheckCart({ skuId: it.skuId, isChecked: target }));
      await Promise.all(tasks);
    } catch (err) {
      console.error(err);
    } finally {
      this.loadCart();
    }
  },

  gotoOrderConfirm() {
    if (this.data.selectedCount <= 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/orderConfirm/orderConfirm' });
  }
});

