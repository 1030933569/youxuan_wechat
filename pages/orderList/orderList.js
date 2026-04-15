const api = require('../../utils/api');
const storage = require('../../utils/storage');
const mockGroup = require('../../utils/mock-group');
const community = require('../../utils/community');
const { definePage } = require('../../utils/mp-guard');

function toNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value) {
  return (Math.round((toNumber(value) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function buildPayUrl(payload = {}) {
  const query = [
    `orderId=${encodeURIComponent(payload.orderId || '')}`,
    `orderNo=${encodeURIComponent(payload.orderNo || '')}`,
    `totalAmount=${encodeURIComponent(payload.totalAmount || '0.00')}`,
    `receiverName=${encodeURIComponent(payload.receiverName || '')}`
  ];

  if (payload.pricingLabel) {
    query.push(`pricingLabel=${encodeURIComponent(payload.pricingLabel)}`);
  }

  return `/pages/mockPay/mockPay?${query.join('&')}`;
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

function resolveGroupStatusText(group) {
  return group && group.status === 'success' ? '已成团' : '拼团中';
}

function resolveGroupProgressText(group) {
  if (!group) return '';
  if (group.status === 'success') return `${group.groupSize}人团，已成团`;
  const remaining = Math.max(group.groupSize - group.joinedCount, 0);
  return `${group.groupSize}人团，还差${remaining}人`;
}

function resolveCommunityText(group) {
  if (!group) return '';
  const communityName = community.normalizeCommunityName(group.communityName || '');
  const leaderName = group.leaderName || '';
  if (communityName && leaderName) return `${communityName} · ${leaderName}带团`;
  return communityName || leaderName;
}

function resolvePricingLabel(group) {
  if (!group) return '';
  return Number(group.groupSize) === 3 ? '3人团价' : '2人团价';
}

function shouldUseGroupPriceForItem(item, group, orderItems = []) {
  if (!group || !group.displayPrice) return false;
  const targetSkuId = Number(group.skuId) || 0;
  if (targetSkuId > 0) return Number(item.skuId) === targetSkuId;
  return orderItems.length === 1;
}

function normalizeOrderItems(orderItems = [], group) {
  return orderItems.map((item) => ({
    ...item,
    displaySkuPrice: shouldUseGroupPriceForItem(item, group, orderItems)
      ? group.displayPrice
      : formatAmount(item.skuPrice || item.cartPrice)
  }));
}

function normalizeOrder(order = {}, groupMap = {}) {
  const group = groupMap[order.orderNo];
  const originalTotalAmountText = group && group.originalTotalAmount
    ? group.originalTotalAmount
    : formatAmount(order.totalAmount || 0);
  const totalAmountText = group && group.displayTotalAmount
    ? group.displayTotalAmount
    : originalTotalAmountText;

  return {
    ...order,
    orderItemList: normalizeOrderItems(order.orderItemList || [], group),
    canPay: isPayableOrder(order),
    groupStatus: group ? group.status : '',
    groupStatusText: group ? resolveGroupStatusText(group) : '',
    groupProgressText: group ? resolveGroupProgressText(group) : '',
    communityText: group ? resolveCommunityText(group) : '',
    pricingLabel: group ? resolvePricingLabel(group) : '',
    originalTotalAmountText,
    totalAmountText,
    savingsAmountText: formatAmount(Math.max(toNumber(originalTotalAmountText) - toNumber(totalAmountText), 0)),
    payTotalAmount: totalAmountText,
    showGroupInvite: !!(group && group.status !== 'success')
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
        receiverName: dataset.receiverName,
        pricingLabel: dataset.pricingLabel
      })
    });
  },

  onInviteGroup(event) {
    const dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
    const orderNo = dataset.orderNo || '';
    if (!orderNo) return;

    const nextGroup = mockGroup.markGroupInviteProgress(orderNo);
    if (!nextGroup) return;

    wx.showToast({
      title: nextGroup.status === 'success' ? '邻里已参团，当前拼团已成团' : '已生成邻里邀请，拼团进度已更新',
      icon: 'none'
    });

    this.resetAndLoad();
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
      const groupMap = mockGroup.getOrderGroupMap ? mockGroup.getOrderGroupMap() : {};
      const nextRecords = ((result && result.records) || []).map((order) => normalizeOrder(order, groupMap));
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
