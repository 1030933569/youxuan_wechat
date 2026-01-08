const api = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    leaderAddressVo: {},
    categoryList: [],
    hotSkuList: [],
    loading: false
  },

  onShow() {
    this.loadHome();
  },

  async loadHome() {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const home = await api.getHomeIndex();
      const leaderAddressVo = home.leaderAddressVo || {};
      storage.setPickupLocation(leaderAddressVo);
      this.setData({
        leaderAddressVo,
        categoryList: home.categoryList || [],
        hotSkuList: home.hotSkuList || []
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onPickupTap() {
    wx.navigateTo({ url: '/pages/pickupLocation/pickupLocation' });
  },

  onProductTap(e) {
    const skuId = e.detail && e.detail.skuId;
    if (!skuId) return;
    wx.navigateTo({ url: `/pages/product/product?skuId=${skuId}` });
  },

  async onAddToCart(e) {
    const skuId = e.detail && e.detail.skuId;
    if (!skuId) return;
    try {
      await api.getAddToCart({ skuId, skuNum: 1 });
      wx.showToast({ title: '已加入购物车', icon: 'none' });
    } catch (err) {
      console.error(err);
    }
  },

  gotoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  gotoOrderList() {
    wx.navigateTo({ url: '/pages/orderList/orderList' });
  }
});

