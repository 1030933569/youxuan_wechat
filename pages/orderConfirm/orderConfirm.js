const api = require('../../utils/api');
const storage = require('../../utils/storage');

function flattenCheckedItems(carInfoVoList) {
  const items = [];
  (carInfoVoList || []).forEach((group) => {
    (group.cartInfoList || []).forEach((sku) => {
      if (sku.isChecked === 1) items.push(sku);
    });
  });
  return items;
}

Page({
  data: {
    orderNo: '',
    leaderAddressVo: {},
    items: [],
    totalAmount: '0.00',
    receiverName: '',
    receiverPhone: '',
    submitting: false
  },

  onShow() {
    this.loadConfirmOrder();
  },

  async loadConfirmOrder() {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    try {
      const order = await api.getConfirmOrder();
      const leaderAddressVo = order.leaderAddressVo || {};
      storage.setPickupLocation(leaderAddressVo);
      this.setData({
        orderNo: order.orderNo || '',
        leaderAddressVo,
        items: flattenCheckedItems(order.carInfoVoList || []),
        totalAmount: Number(order.totalAmount || 0).toFixed(2)
      });
    } catch (e) {
      console.error(e);
    }
  },

  onNameInput(e) {
    this.setData({ receiverName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ receiverPhone: e.detail.value });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const receiverName = String(this.data.receiverName || '').trim();
    const receiverPhone = String(this.data.receiverPhone || '').trim();
    if (!receiverName) {
      wx.showToast({ title: '请输入提货人姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(receiverPhone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      await api.postSubmitOrder({
        couponId: 0,
        leaderId: this.data.leaderAddressVo.leaderId || 0,
        orderNo: this.data.orderNo,
        receiverName,
        receiverPhone
      });
      wx.showToast({ title: '下单成功', icon: 'none' });
      wx.redirectTo({ url: '/pages/orderList/orderList' });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
