const api = require('../../utils/api');
const mockGroup = require('../../utils/mock-group');
const { definePage } = require('../../utils/mp-guard');

function formatAmount(value) {
  return (Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function buildPricingView(price) {
  const singlePrice = formatAmount(price);
  const group2Price = formatAmount(Number(singlePrice) * 0.95);
  const group3Price = formatAmount(Number(singlePrice) * 0.9);

  return {
    singlePrice,
    group2Price,
    group3Price,
    group2Savings: formatAmount(Number(singlePrice) - Number(group2Price)),
    group3Savings: formatAmount(Number(singlePrice) - Number(group3Price))
  };
}

function resolveSelectedPricing(data = {}) {
  const pricingView = data.pricingView || buildPricingView(data.skuInfo && data.skuInfo.price);
  const groupSize = Number(data.selectedGroupSize) === 3 ? 3 : 2;

  if (groupSize === 3) {
    return {
      groupSize,
      pricingMode: 'group3',
      originalPrice: pricingView.singlePrice,
      displayPrice: pricingView.group3Price
    };
  }

  return {
    groupSize: 2,
    pricingMode: 'group2',
    originalPrice: pricingView.singlePrice,
    displayPrice: pricingView.group2Price
  };
}

definePage({
  data: {
    skuId: 0,
    skuInfo: {},
    images: [],
    pricingView: buildPricingView(0),
    selectedGroupSize: 2
  },

  onLoad(options) {
    const skuId = Number(options && options.skuId);
    if (!skuId) {
      wx.showToast({ title: '商品参数错误', icon: 'none' });
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
      this.setData({
        skuInfo,
        images,
        pricingView: buildPricingView(skuInfo.price)
      });
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

  onSelectGroupSize(e) {
    const groupSize = Number(e.currentTarget.dataset.size);
    if (groupSize !== 2 && groupSize !== 3) return;
    this.setData({ selectedGroupSize: groupSize });
  },

  async onStartGroup() {
    const skuId = Number(this.data.skuId);
    if (!skuId) return;
    const selectedPricing = resolveSelectedPricing(this.data);

    mockGroup.saveDraftGroup({
      skuId,
      groupSize: selectedPricing.groupSize,
      pricingMode: selectedPricing.pricingMode,
      originalPrice: selectedPricing.originalPrice,
      displayPrice: selectedPricing.displayPrice
    });

    try {
      await api.getAddToCart({ skuId, skuNum: 1 });
      wx.showToast({ title: `已发起${selectedPricing.groupSize}人团`, icon: 'none' });
      wx.switchTab({ url: '/pages/cart/cart' });
    } catch (e) {
      console.error(e);
    }
  },

  gotoCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  }
});
