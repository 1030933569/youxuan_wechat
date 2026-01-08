const api = require('../../utils/api');
const storage = require('../../utils/storage');

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
  });
}

Page({
  data: {
    loading: false
  },

  onLoad() {
    const token = storage.getToken();
    if (token) wx.reLaunch({ url: '/pages/index/index' });
  },

  async onWxLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const { code } = await wxLogin();
      if (!code) throw new Error('wx.login: no code');

      const result = await api.getWxLogin({ code });
      if (result && result.token) storage.setToken(result.token);
      if (result && result.userId) storage.setUserId(result.userId);

      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});

