const api = require('../../utils/api');
const storage = require('../../utils/storage');
const { definePage } = require('../../utils/mp-guard');

definePage({
  data: {
    takeName: '', // 提货点名称
    detailAddress: '', // 详细地址
    latitude: '', // 纬度
    longitude: '', // 经度
    loading: false
  },

  onLoad() {
    // 获取当前位置
    this.getLocation();
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: () => {
        wx.showToast({
          title: '无法获取位置',
          icon: 'none'
        });
      }
    });
  },

  onTakeNameInput(e) {
    this.setData({ takeName: e.detail.value });
  },

  onDetailAddressInput(e) {
    this.setData({ detailAddress: e.detail.value });
  },

  async onSubmit() {
    const { takeName, detailAddress, latitude, longitude } = this.data;

    if (!takeName) {
      wx.showToast({
        title: '请填写提货点名称',
        icon: 'none'
      });
      return;
    }

    if (!detailAddress) {
      wx.showToast({
        title: '请填写详细地址',
        icon: 'none'
      });
      return;
    }

    if (!latitude || !longitude) {
      wx.showToast({
        title: '请获取位置信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const leaderData = {
        takeName,
        detailAddress,
        latitude,
        longitude,
        haveStore: 1,
        takeType: '1',
        workStatus: 0
      };

      const result = await api.postApplyLeader(leaderData);

      wx.showToast({
        title: '开团成功',
        icon: 'success'
      });

      // 保存提货点信息到本地存储
      storage.setPickupLocation({
        id: result.leaderId,
        leaderId: result.leaderId,
        takeName: result.takeName,
        detailAddress: result.detailAddress
      });

      // 返回首页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('开团失败:', err);
      wx.showToast({
        title: '开团失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
