const storage = require('../../utils/storage');
const community = require('../../utils/community');
const { definePage } = require('../../utils/mp-guard');

function normalizeUserInfo(userInfo = {}) {
  return {
    nickName: userInfo.nickName || userInfo.nickname || '微信用户',
    phone: userInfo.phone || '未绑定手机号',
    avatarUrl: userInfo.avatarUrl || userInfo.photoUrl || ''
  };
}

function normalizePickup() {
  const pickup = community.normalizePickupLocation(storage.getPickupLocation() || {});
  return {
    takeName: pickup.takeName || '大连中山社区优选点',
    detailAddress: pickup.detailAddress || '辽宁省大连市中山区人民路社区优选点',
    leaderName: pickup.leaderName || '陈新'
  };
}

definePage({
  data: {
    hasToken: false,
    userId: '',
    userInfo: normalizeUserInfo(),
    pickupLocation: normalizePickup(),
    orderStats: [
      { label: '待支付', value: '0' },
      { label: '待提货', value: '0' },
      { label: '已完成', value: '0' }
    ]
  },

  onShow() {
    this.refreshProfile();
  },

  refreshProfile() {
    this.setData({
      hasToken: !!storage.getToken(),
      userId: storage.getUserId(),
      userInfo: normalizeUserInfo(storage.getUserInfo() || {}),
      pickupLocation: normalizePickup()
    });
  },

  onLoginTap() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onOrderTap() {
    wx.switchTab({ url: '/pages/orderList/orderList' });
  },

  onPickupTap() {
    wx.navigateTo({ url: '/pages/pickupLocation/pickupLocation' });
  },

  onCartTap() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  onApplyLeaderTap() {
    wx.navigateTo({ url: '/pages/applyLeader/applyLeader' });
  }
});
