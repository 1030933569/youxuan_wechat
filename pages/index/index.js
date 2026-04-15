const api = require('../../utils/api');
const storage = require('../../utils/storage');
const community = require('../../utils/community');
const { definePage } = require('../../utils/mp-guard');

definePage({
  data: {
    leaderAddressVo: {},
    categoryList: [],
    hotSkuList: [],
    defaultHotSkuList: [],
    selectedCategoryId: null,
    selectedCategoryName: '',
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

      const localPickup = community.normalizePickupLocation(storage.getPickupLocation() || {});
      const serverLeaderAddressVo = home && home.leaderAddressVo ? community.normalizePickupLocation(home.leaderAddressVo) : null;
      const serverLeaderId = serverLeaderAddressVo && (serverLeaderAddressVo.leaderId || serverLeaderAddressVo.id);
      const localLeaderId = localPickup && (localPickup.leaderId || localPickup.id);
      const leaderAddressVo = serverLeaderId
        ? serverLeaderAddressVo
        : localLeaderId
          ? localPickup
          : (serverLeaderAddressVo || localPickup || {});

      if (serverLeaderId) storage.setPickupLocation(serverLeaderAddressVo);

      const hotSkuList = home.hotSkuList || [];
      const selectedCategoryId = this.data.selectedCategoryId;
      const nextData = {
        leaderAddressVo,
        categoryList: home.categoryList || [],
        defaultHotSkuList: hotSkuList
      };
      if (!selectedCategoryId) {
        nextData.hotSkuList = hotSkuList;
      }
      this.setData(nextData);
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onPickupTap() {
    wx.navigateTo({ url: '/pages/pickupLocation/pickupLocation' });
  },

  onApplyLeaderTap() {
    wx.navigateTo({ url: '/pages/applyLeader/applyLeader' });
  },

  onProductTap(e) {
    const skuId = e.detail && e.detail.skuId;
    if (!skuId) return;
    wx.navigateTo({ url: `/pages/product/product?skuId=${skuId}` });
  },

  async onCategoryTap(e) {
    const categoryId = Number(e.currentTarget.dataset.id);
    const categoryName = e.currentTarget.dataset.name || '';
    if (!Number.isFinite(categoryId) || categoryId <= 0) return;

    if (this.data.selectedCategoryId === categoryId) {
      this.setData({
        selectedCategoryId: null,
        selectedCategoryName: '',
        hotSkuList: this.data.defaultHotSkuList || []
      });
      wx.showToast({ title: '已取消分类筛选', icon: 'none' });
      return;
    }

    this.setData({
      selectedCategoryId: categoryId,
      selectedCategoryName: categoryName
    });

    try {
      const result = await api.getSearchSku({ page: 1, limit: 10, categoryId });
      const content = (result && result.content) || [];
      this.setData({ hotSkuList: content });
      if (content.length === 0) {
        wx.showToast({ title: '该分类暂时没有商品', icon: 'none' });
      } else if (categoryName) {
        wx.showToast({ title: `已切换到${categoryName}`, icon: 'none' });
      }
    } catch (err) {
      console.error(err);
    }
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
  }
});
