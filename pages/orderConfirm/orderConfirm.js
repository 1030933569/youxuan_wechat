const api = require('../../utils/api');
const storage = require('../../utils/storage');
const { definePage } = require('../../utils/mp-guard');

function flattenCheckedItems(carInfoVoList) {
  const items = [];
  (carInfoVoList || []).forEach((group) => {
    (group.cartInfoList || []).forEach((sku) => {
      if (sku.isChecked === 1) items.push(sku);
    });
  });
  return items;
}

definePage({
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

      const localPickup = storage.getPickupLocation() || {};
      const serverLeaderAddressVo = order && order.leaderAddressVo ? order.leaderAddressVo : null;
      const serverLeaderId = Number(serverLeaderAddressVo && (serverLeaderAddressVo.leaderId || serverLeaderAddressVo.id));
      const localLeaderId = Number(localPickup && (localPickup.leaderId || localPickup.id));

      let leaderAddressVo = serverLeaderAddressVo || localPickup || {};
      if (Number.isFinite(serverLeaderId) && serverLeaderId > 0) {
        leaderAddressVo = serverLeaderAddressVo;
        storage.setPickupLocation(serverLeaderAddressVo);
      } else if (Number.isFinite(localLeaderId) && localLeaderId > 0) {
        leaderAddressVo = localPickup;
        // 兼容历史：如果本地有提货点但后端未绑定，则同步一次到后端
        try {
          const synced = await api.getSelectLeader({ leaderId: localLeaderId });
          if (synced) {
            leaderAddressVo = synced;
            storage.setPickupLocation(synced);
          }
        } catch (err) {
          console.error(err);
        }
      }
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

    const leaderAddressVo = this.data.leaderAddressVo || {};
    const leaderId = Number(leaderAddressVo.leaderId || leaderAddressVo.id);
    if (!Number.isFinite(leaderId) || leaderId <= 0) {
      wx.showToast({ title: '请先选择提货点', icon: 'none' });
      wx.navigateTo({ url: '/pages/pickupLocation/pickupLocation' });
      return;
    }

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
      await api.getSelectLeader({ leaderId });
      await api.postSubmitOrder({
        couponId: 0,
        leaderId,
        orderNo: this.data.orderNo,
        receiverName,
        receiverPhone
      });
      wx.showToast({ title: '下单成功', icon: 'none' });
      wx.switchTab({ url: '/pages/orderList/orderList' });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
