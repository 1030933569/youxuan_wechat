const api = require('../../utils/api');
const { definePage } = require('../../utils/mp-guard');

function decodeValue(value) {
  if (value === undefined || value === null) return '';
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

definePage({
  data: {
    orderId: '',
    orderNo: '',
    totalAmount: '0.00',
    receiverName: '',
    paying: false
  },

  onLoad(options) {
    const orderNo = decodeValue(options.orderNo);
    if (!orderNo) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      wx.switchTab({ url: '/pages/orderList/orderList' });
      return;
    }

    this.setData({
      orderId: decodeValue(options.orderId),
      orderNo,
      totalAmount: decodeValue(options.totalAmount) || '0.00',
      receiverName: decodeValue(options.receiverName)
    });
  },

  onCancel() {
    wx.switchTab({ url: '/pages/orderList/orderList' });
  },

  async onConfirmPay() {
    if (this.data.paying) return;

    this.setData({ paying: true });
    try {
      await api.postMockPay({ orderNo: this.data.orderNo });
      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });

      setTimeout(() => {
        this.setData({ paying: false });
        wx.switchTab({ url: '/pages/orderList/orderList' });
      }, 500);
    } catch (error) {
      console.error(error);
      this.setData({ paying: false });
    }
  }
});
