const api = require('../../utils/api');

Page({
  data: {
    skuId: 0,
    skuInfo: {},
    images: []
  },

  onLoad(options) {
    const skuId = Number(options && options.skuId);
    if (!skuId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.setData({ skuId });
    this.loadDetail(skuId);
  },

  async loadDetail(skuId) {
    try {
      const detail = await api.getHomeItem({ skuId });
      const skuInfo = detail.skuInfoVo || {};
      const images = skuInfo.skuImagesList && skuInfo.skuImagesList.length > 0 ? skuInfo.skuImagesList : [{ imgUrl: skuInfo.imgUrl }];
      this.setData({ skuInfo, images });
    } catch (e) {
      console.error(e);
    }
  },

  async addToCart() {
    try {
      await api.getAddToCart({ skuId: this.data.skuId, skuNum: 1 });
      wx.showToast({ title: '已加入购物车', icon: 'none' });
    } catch (e) {
      console.error(e);
    }
  },

  gotoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  }
});

