const api = require('../../utils/api');
const storage = require('../../utils/storage');
const { definePage } = require('../../utils/mp-guard');

function buildPayUrl(payload = {}) {
  const query = [
    `orderId=${encodeURIComponent(payload.orderId || '')}`,
    `orderNo=${encodeURIComponent(payload.orderNo || '')}`,
    `totalAmount=${encodeURIComponent(payload.totalAmount || '0.00')}`,
    `receiverName=${encodeURIComponent(payload.receiverName || '')}`
  ].join('&');

  return `/pages/mockPay/mockPay?${query}`;
}

function isPayableOrder(order = {}) {
  const status = order.orderStatus;
  if (status === 0 || status === '0' || status === 'UNPAID') return true;

  if (status && typeof status === 'object') {
    if (status.code === 0 || status.code === '0' || status.name === 'UNPAID') {
      return true;
    }
  }

  const statusName = String(order.param && order.param.orderStatusName ? order.param.orderStatusName : '');
  return statusName.includes('待支付');
}

function normalizeOrder(order = {}) {
  return {
    ...order,
    canPay: isPayableOrder(order)
  };
}

definePage({
  data: {
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onShow() {
    this.resetAndLoad();
  },

  onPullDownRefresh() {
    this.resetAndLoad().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadMore();
  },

  onPayOrder(event) {
    const dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
    const orderNo = dataset.orderNo || '';
    if (!orderNo) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: buildPayUrl({
        orderId: dataset.orderId,
        orderNo,
        totalAmount: dataset.totalAmount,
        receiverName: dataset.receiverName
      })
    });
  },

  async resetAndLoad() {
    this.setData({ records: [], page: 1, hasMore: true });
    await this.loadMore(true);
  },

  async loadMore(reset = false) {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });
    try {
      const page = this.data.page;
      const result = await api.getFindUserOrder({ page, limit: this.data.limit });
      const nextRecords = ((result && result.records) || []).map(normalizeOrder);
      const records = reset ? nextRecords : this.data.records.concat(nextRecords);
      const pages = Number((result && result.pages) || 0);
      const hasMore = pages > 0 ? page < pages : false;

      this.setData({
        records,
        hasMore,
        page: page + 1
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  }
});
